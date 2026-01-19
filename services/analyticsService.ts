import { PageAnalytics, PageAnalyticsSummary } from '../types';

interface GA4Credentials {
  property_id: string;
  credentials_json: any;
}

class AnalyticsService {
  async fetchPageAnalytics(
    credentials: GA4Credentials,
    pageUrls: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, PageAnalytics[]>> {
    const analyticsData = new Map<string, PageAnalytics[]>();

    for (const url of pageUrls) {
      const weeklyData = await this.fetchWeeklyDataForUrl(
        credentials,
        url,
        startDate,
        endDate
      );
      analyticsData.set(url, weeklyData);
    }

    return analyticsData;
  }

  private async fetchWeeklyDataForUrl(
    credentials: GA4Credentials,
    url: string,
    startDate: Date,
    endDate: Date
  ): Promise<PageAnalytics[]> {
    const weeks = this.getWeekRanges(startDate, endDate);
    const data: PageAnalytics[] = [];

    for (const week of weeks) {
      const weekData = await this.fetchGA4Data(
        credentials,
        url,
        week.start,
        week.end
      );

      data.push({
        id: '',
        project_id: '',
        page_id: '',
        week_start_date: week.start.toISOString().split('T')[0],
        pageviews: weekData.pageviews,
        unique_pageviews: weekData.uniquePageviews,
        avg_time_on_page: weekData.avgTimeOnPage,
        bounce_rate: weekData.bounceRate,
        synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    return data;
  }

  private async fetchGA4Data(
    credentials: GA4Credentials,
    url: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    pageviews: number;
    uniquePageviews: number;
    avgTimeOnPage: number;
    bounceRate: number;
  }> {
    const formattedStartDate = this.formatDateForGA4(startDate);
    const formattedEndDate = this.formatDateForGA4(endDate);

    try {
      const response = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + credentials.property_id + ':runReport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAccessToken(credentials.credentials_json)}`,
        },
        body: JSON.stringify({
          dateRanges: [{
            startDate: formattedStartDate,
            endDate: formattedEndDate,
          }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'totalUsers' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'EXACT',
                value: new URL(url).pathname,
              },
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`GA4 API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.rows || data.rows.length === 0) {
        return {
          pageviews: 0,
          uniquePageviews: 0,
          avgTimeOnPage: 0,
          bounceRate: 0,
        };
      }

      const row = data.rows[0];
      return {
        pageviews: parseInt(row.metricValues[0].value) || 0,
        uniquePageviews: parseInt(row.metricValues[1].value) || 0,
        avgTimeOnPage: parseFloat(row.metricValues[2].value) || 0,
        bounceRate: parseFloat(row.metricValues[3].value) || 0,
      };
    } catch (error) {
      console.error('Error fetching GA4 data:', error);
      return {
        pageviews: 0,
        uniquePageviews: 0,
        avgTimeOnPage: 0,
        bounceRate: 0,
      };
    }
  }

  private async getAccessToken(credentialsJson: any): Promise<string> {
    const jwtToken = await this.createJWT(credentialsJson);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  private async createJWT(credentials: any): Promise<string> {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: credentials.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const encoder = new TextEncoder();
    const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadBase64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const signatureInput = `${headerBase64}.${payloadBase64}`;

    const privateKey = await this.importPrivateKey(credentials.private_key);
    const signature = await crypto.subtle.sign(
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      },
      privateKey,
      encoder.encode(signatureInput)
    );

    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${signatureInput}.${signatureBase64}`;
  }

  private async importPrivateKey(pem: string): Promise<CryptoKey> {
    const pemContents = pem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    return await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
  }

  private formatDateForGA4(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getWeekRanges(startDate: Date, endDate: Date): Array<{ start: Date; end: Date }> {
    const weeks: Array<{ start: Date; end: Date }> = [];
    const current = new Date(startDate);

    current.setDate(current.getDate() - current.getDay());

    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);

      weeks.push({
        start: weekStart,
        end: weekEnd > endDate ? endDate : weekEnd,
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  calculateSummary(analyticsData: PageAnalytics[]): PageAnalyticsSummary {
    if (analyticsData.length === 0) {
      return {
        totalPageviews: 0,
        avgWeeklyPageviews: 0,
        trend: 'stable',
        trendPercentage: 0,
        weeklyData: [],
      };
    }

    const sortedData = [...analyticsData].sort((a, b) =>
      new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime()
    );

    const totalPageviews = sortedData.reduce((sum, week) => sum + week.pageviews, 0);
    const avgWeeklyPageviews = totalPageviews / sortedData.length;

    const midpoint = Math.floor(sortedData.length / 2);
    const firstHalf = sortedData.slice(0, midpoint);
    const secondHalf = sortedData.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, w) => sum + w.pageviews, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, w) => sum + w.pageviews, 0) / secondHalf.length;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (firstHalfAvg > 0) {
      trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

      if (trendPercentage > 5) {
        trend = 'up';
      } else if (trendPercentage < -5) {
        trend = 'down';
      }
    }

    const weeklyData = sortedData.map(week => ({
      week: new Date(week.week_start_date).toLocaleDateString('de-DE', {
        month: 'short',
        day: 'numeric'
      }),
      pageviews: week.pageviews,
    }));

    return {
      totalPageviews,
      avgWeeklyPageviews: Math.round(avgWeeklyPageviews),
      trend,
      trendPercentage: Math.round(trendPercentage),
      weeklyData,
    };
  }

  async testConnection(credentials: GA4Credentials): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken(credentials.credentials_json);

      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${credentials.property_id}/metadata`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export const analyticsService = new AnalyticsService();
