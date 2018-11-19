import { UserService } from 'src/app/shared/services/user.service';
import { AuthService } from './../../auth/auth.service';
import { Injectable } from '@angular/core';
import * as ReportViewModel from '../view-models/report.viewmodel';
import { HttpClient, HttpParams } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private http: HttpClient, private authService: AuthService, private userService: UserService) {}
  URL = '../../../assets/example-data/';

  private reports = [];

  /**
   * Gets all the reports for all organizations
   */
  public async getAllReports(): Promise<ReportViewModel.SimpleReport[]> {
    try {
      const raw = await this.http.get<ReportViewModel.SimpleRawReport[]>('/api' + '/getAllReports').toPromise();
      console.log(raw);
      this.reports = raw;
      const reports = await this.cleanSimpleRawReport(raw);
      return await reports;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Should be the same call as getAllReports()
   * but this one keeps the org[]
   */
  public async getAllRawReports(): Promise<ReportViewModel.SimpleRawReport[]> {
    return await this.http.get<ReportViewModel.SimpleRawReport[]>('/api' + '/getAllReports').toPromise();
  }

  /**
   * Seperates a report if it has more than one organization tied to it
   * @param rawReports reports from server that has organization array
   */
  private async cleanSimpleRawReport(rawReports: ReportViewModel.SimpleRawReport[]): Promise<ReportViewModel.SimpleReport[]> {
    const reports: ReportViewModel.SimpleReport[] = [];
    for (const report of rawReports) {
      console.log(report);
      if (report.organizations.length > 1) {
        for (const org of report.organizations) {
          const temp1 = {
            name: report.name,
            _id: report._id,
            created_at: report.created_at,
            organization: org
          };
          reports.push(temp1);
        }
      } else {
        const temp2 = {
          name: report.name,
          _id: report._id,
          created_at: report.created_at,
          organization: report.organizations[0]
        };
        reports.push(temp2);
      }
    }
    return await reports;
  }

  /**
   *  Gets the reports for a specific organization.
   * @param orgID ID of a specific organization
   * Used for Organization Details view
   */
  public async getReportsByOrganization(orgID: string): Promise<ReportViewModel.SimpleReport[]> {
    try {
      const raw = await this.http.get<ReportViewModel.SimpleRawReport[]>('/api' + '/getReportByOrganization/' + orgID).toPromise();
      console.log(raw);
      this.reports = raw;
      console.log(this.http.get<ReportViewModel.SimpleRawReport[]>('/api' + '/getReportByOrganization/' + orgID).toPromise());
      const reports = (await this.cleanSimpleRawReport(raw)).filter(report => {
        return report.organization._id === orgID;
      });
      return reports;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Get all reports for this user
   */
  public async getReportByUser(userID: string): Promise<ReportViewModel.SimpleReport[]> {
    try {
      console.log('Get Report By User called');
      const allReports = await this.http.get<ReportViewModel.SimpleRawReport[]>('/api' + '/getReportByUser/' + userID).toPromise();
      this.reports = allReports;
      /*
      const user = await this.userService.getUser(userID);
      const allReports = [];
      for (const org of user.organizations) {
        const tempReports = await this.http.get<ReportViewModel.SimpleRawReport[]>('/api' + '/getReportByOrganization/' + org._id).toPromise();
        for ( const rep of tempReports) {
          if (allReports.findIndex(x => x._id === rep._id) === -1) {
            allReports.push(rep);
          }
        }
      */
      const reports = await this.cleanSimpleRawReport(allReports);
      return reports;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Gets all the details(with meta data) for a specific report and specific organization view
   * @param reportId - ID of the specific report
   * @param orgID - ID of the organization whose report POV you want to show
   */
  public async getReport(reportID, orgID) {
    /*
    if ( this.reports.length === 0) {
      console.log('Taken from API report');
      const raw = await this.http.get<ReportViewModel.ReportWithMetaData[]>('/api' + '/getAllReports').toPromise();
      console.log(raw);
      const report = raw.find(element => {
        return element._id === reportID;
      });
      return <ReportViewModel.ReportWithMetaData>report;
    } else {
      console.log('Taken from LOCAL REPORT');
      const report = this.reports.find(element => {
        return element._id === reportID;
      });
      return await <ReportViewModel.ReportWithMetaData>report;
    }*/
    return await this.http.get<ReportViewModel.ReportWithMetaData>('/api' + '/getAllReports/' + reportID).toPromise();

    /*
    return await this.http
      .get<ReportViewModel.ReportWithMetaData>(
        '/api' + 'single-report-with-meta.mockdata.json',
        {
          params: {
            reportID: reportID,
            orgID: orgID
          }
        }
      )
      .toPromise();
      */
  }

  /**
   * Gets all report details for editing report
   * @param reportId - ID of the specific report
   */
  public async getReportDetails(reportID): Promise<ReportViewModel.ReportDetails> {
    return await this.http.get<ReportViewModel.ReportDetails>('/api' + '/getAllReports/' + reportID).toPromise();
  }

  /**
   * Gets a specific report with no metadata for a specific report and specific organization view
   * @param reportId - ID of the specific report
   * @param orgID - ID of the organization whose report POV you want to show
   */
  public async getReportNoMetaData(reportID, orgID): Promise<ReportViewModel.Report> {
    return await this.http
      .get<ReportViewModel.Report>('/api' + '/getAllReports', {
        params: {
          reportID: reportID,
          orgID: orgID
        }
      })

      .toPromise();
  }

  /**
   * Create new Report
   * @param report - report object
   */
  public async createNewReport(report: ReportViewModel.CreateNewReport) {
    console.log('Report Created: ' + report);
    if (await this.authService.canSend()) {
      return await this.http.post('/api' + '/createReport/', report).toPromise();
    } else {
      return await {
        status: '403',
        message: 'You do not have permission to perform this action'
      };
    }
  }

  /**
   * Share report by giving an organization access to it
   * @param report - the report object you want to share
   * @param org - organization object you want to share the report with
   */
  public async shareReport(report, org) {
    console.log('Share Access');
    const param = {
      report: report,
      organization: org
    };
    console.log(param);
    if (await this.authService.canSend()) {
      return await this.http
        .post('/api' + '/shareReport/', param)
        .toPromise();
    } else {
      return await {
        status: '403',
        message: 'You do not have permission to perform this action'
      };
    }

  }

  /**
   * Editing Report
   * @param report - report object
   */
  public async editReport(oldReport, newReport) {
    const params = {
      oldReport: oldReport,
      newReport: newReport
    };
    if (await this.authService.canSend()) {
      return await this.http.post('/api/' + 'editReport/', params).toPromise();
    } else {
      return await {
        status: '403',
        message: 'You do not have permission to perform this action'
      };
    }
  }

  /**
   * Delete Organization Acccess for this report
   * @param report - the report object you want to revoke access too
   * @param org - organization object you want to unshare the report to
   */
  public async deleteOrgAccess(report, permissions) {
    const params = {
      report: report,
      permissions: permissions
    };
    console.log('Delete Access');
    if (await this.authService.canSend()) {
      return await this.http.post('/api' + '/unshareReport/', params).toPromise();
    } else {
      return await {
        status: '403',
        message: 'You do not have permission to perform this action'
      };
    }
  }

  /**
   * Delete Report.
   * Calls the permissions API  then sends it to delete API along with the report object
   * @param report - report object you want to delete
   */
  public async deleteReport(report: ReportViewModel.ReportWithMetaData, permissions) {
    console.log('report deleted: ' + JSON.stringify(report));
    if (await this.authService.canSend()) {
      const parameter = {
        report: report,
        permissions: permissions
      };
      console.log(parameter);
      return await this.http.post('/api/' + 'deleteReport/', parameter).toPromise();
    } else {
      return await {
        status: '403',
        message: 'You do not have permission to perform this action'
      };
    }
  }

  /**
   * Helper used in delete report.
   * To retrieve the list of file permissions to be revoked
   */
  public async getPermissionsToRevoke(report, organization) {
    if (await this.authService.canSend()) {
      console.log('Getting permissions called...');
      // for unsharing report  organizaiton
      if (organization != null) {
        const params = {
          report: report,
          organization: organization
        };
        return await this.http.post('/api/' + 'getPermissionsToRevoke/', params).toPromise();
      } else {
        // for delete report
        const params = {
          report: report,
          organization: null
        };
        return await this.http.post('/api/' + 'getPermissionsToRevoke/', params).toPromise();
      }
    } else {
      return await {
        status: '403',
        message: 'You do not have permission to perform this action'
      };
    }
  }

  public async getReportMock() {
    return await this.http.get('../../../assets/example-data/report-mock.mockdata.json').toPromise();
  }
}
