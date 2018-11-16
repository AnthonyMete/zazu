import { UserService } from './user.service';
import { AuthService } from 'src/app/auth/auth.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as ReportViewModel from '../view-models/report.viewmodel';
import { ReportService } from './report.service';
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ViewerService {
  constructor(private http: HttpClient, private reportService: ReportService, private authService: AuthService, private userService: UserService) {}
  userID: string;
  reports;
  currentOrganization;
  organizations;
  user;
  status;
  initalized = false;
  initialized = new BehaviorSubject<Boolean>(false);
  init = true;

  setUserID(id) {
    this.userID = id;
  }

  async getReports() {
    if (!this.reports) {
      try {
        this.reports = await this.reportService.getReportByUser(this.userID);
      } catch (error) {
        console.log(error);
      }
    }
    return this.reports;
  }

  async getReport(reportID): Promise<ReportViewModel.Report> {
    return this.reportService.getReportNoMetaData(reportID, 'temp');
  }

  async reportsCount() {
    if (!this.reports) {
      await this.getReports();
    }
    return await this.reports.length;
  }

  getOrganizations() {
    return this.organizations;
  }

  getInitialized() {
    return this.initialized;
  }

  getOrganization(id) {
    return this.organizations.find(x => x._id === id);
  }

  getUser() {
    return this.user;
  }

  getReportsByOrganization(orgID) {
    return this.reports.filter(report => report.organization._id === orgID);
  }

  chooseOrganization(orgID) {
    this.currentOrganization = this.organizations.find(org => org._id === orgID);
  }

  public reportsCountByOrg(orgID) {
    return this.getReportsByOrganization(orgID).length;
  }

  public async initializeGhost(org, user) {
    const params = {
      organization: org,
      user: user
    };
    return await this.http.post('/api' + '/initGhost', params).toPromise();
  }


  public async getReportByUser(userID) {
    return await this.http.get<ReportViewModel.SimpleRawReport[]>('/api' + '/getReportByUser/' + userID).toPromise();
  }

  async initialSet(userID) {
    try {
      console.log('initial set called');
      const status = await this.authService.isLoggedIn();
      console.log(status);
      if (status.role === 'viewer') {
        this.user = await this.userService.getUser(status.user);
        console.log(this.user);
        this.reports = await this.reportService.getReportByUser(status.user);
        console.log(this.reports);
      } else if (status.role === 'admin') {
        this.user = await this.userService.getUser(userID);
        console.log(this.user);
        this.reports = await this.reportService.getReportByUser(userID);
        console.log(this.reports);
      }
      const orgs = [];
      for (const rep of await this.reports) {
        console.log(rep);
        if (orgs.findIndex(x => x._id === rep.organization._id) === -1) {
          const temp = {
            _id: rep.organization._id,
            name: rep.organization.name,
            reportsCount: null
          };
          orgs.push(temp);
        }
      }
      this.organizations = await orgs;
      for (const org of this.organizations) {
        org.reportsCount = await this.reportsCountByOrg(org._id);
      }
      console.log(this.organizations);
      this.initialized.next(true);
    } catch (error) {}
  }
}
