import { AuthService } from 'src/app/auth/auth.service';
import { ViewerService } from 'src/app/shared/services/viewer.service';
import { UserService } from './../../shared/services/user.service';
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { ReportService } from '../../shared/services/report.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import * as ReportViewModel from '../../shared/view-models/report.viewmodel';
import { OrganizationService } from '../../shared/services/organization.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatSnackBar } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-admin-report-details',
  templateUrl: './admin-report-details.component.html',
  styleUrls: ['./admin-report-details.component.scss']
})
export class AdminReportDetailsComponent implements OnInit, OnDestroy {
  constructor(
    private reportService: ReportService,
    private route: ActivatedRoute,
    private userService: UserService,
    private organizationService: OrganizationService,
    public dialog: MatDialog,
    private router: Router,
    public snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
    private viewerService: ViewerService,
    private authService: AuthService,
  ) {
  }

  sub: any;
  organizationID;
  userID;
  reportID;
  organization = null;
  user = undefined;
  report: ReportViewModel.ReportWithMetaData = null;
  userView: boolean;
  viewInitialized = false;
  selectedOrgID;
  selectedOrg;
  new = false;
  edited = false;
  embedLink;
  permissions;
  shared;
  adminUser;
  async ngOnInit() {
    try {
      this.viewInitialized = false;
      // this.viewerService.initializeGhost()
      this.adminUser = await this.userService.getUser(this.authService.userID);
      this.sub = this.route.params.subscribe(params => {
        this.organizationID = params['id'];
        this.userID = params['userID'];
        this.reportID = params['reportID'];
      });
      this.selectedOrgID = await this.route.snapshot.queryParamMap.get('selectedOrg');
      this.report = await this.reportService.getReport(this.reportID, this.selectedOrgID);
      this.selectedOrg = await this.report.organizations.find( org => {
        return org._id === this.selectedOrgID;
      });
      // initializes ghost
      const ghostStatus = await <any> this.viewerService.initializeGhost(this.selectedOrg, this.adminUser);
      console.log(ghostStatus);
      if (this.userID !== undefined) {
        this.userView = true;
        this.user = await this.userService.getLocalUser(this.userID);
      } else {
        this.userView = false;
        this.user = false;
      }
      if (this.organizationID) {
        this.organization = await this.organizationService.getLocalOrganization(this.organizationID);
      } else {
        this.organization = false;
      }
      this.new = (await this.route.snapshot.queryParamMap.get('new')) === 'new';
      this.edited = (await this.route.snapshot.queryParamMap.get('edited')) === 'true';
      this.shared = (await this.route.snapshot.queryParamMap.get('shared')) === 'true';

      const patt = new RegExp('google\.com\/(.)+\/reporting');
      console.log(this.report.link);
      const replaceLink = this.report.link.replace(patt, 'google.com/embed/reporting');
      console.log(replaceLink);
      this.embedLink = this.sanitizer.bypassSecurityTrustResourceUrl(replaceLink);
      console.log(this.embedLink);
      if (ghostStatus.status === '200') {
        this.viewInitialized = await true;
      } else {
        this.snackBar.open('Failed to initialize view: ' + ghostStatus.message, 'Dismiss', {
          duration: 5000,
        });
      }
    } catch (error) {
      console.log(error);
    }

  }

  editReport() {
    this.router.navigate(['./edit-report'], { relativeTo: this.route, queryParams: { selectedOrg: this.selectedOrgID}} );
  }


  editAccess() {
    this.router.navigate(['./edit-access'], { relativeTo: this.route, queryParams: { selectedOrg: this.selectedOrgID}} );
  }

  async openDialog( ) {
    this.permissions = await this.getPermissions();
    console.log(this.permissions);
    const dialogRef = this.dialog.open(DeleteReportConfirmation, {
      data: { report: this.report.name}
    });
     dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        const status = await <any>this.reportService.deleteReport(this.report, this.permissions.permissions);
        console.log(await status);
        if (await status.status === '200') {
          this.snackBar.open('Report Deleted: ' + this.report.name, 'Dismiss', {
            duration: 5000,
          });
          this.router.navigate(['../../'], { relativeTo: this.route, queryParams: { selectedOrg: this.selectedOrgID} });
        } else {
          this.snackBar.open('Error: ' + status.message, 'Dismiss', {
            duration: 5000,
          });
        }
      }
    });
  }

  async getPermissions() {
    return await this.reportService.getPermissionsToRevoke(this.report, null);
  }

  ngOnDestroy() {
    this.viewInitialized = false;
    this.sub.unsubscribe();
  }


  closeNewBar() {
    this.new = false;
    this.edited = false;
    this.shared = false;
  }
}



@Component({
  selector: 'delete-report-confirmation',
  templateUrl: 'delete-report-confirmation.html'
})
export class DeleteReportConfirmation {
  constructor(
    public dialogRef: MatDialogRef<DeleteReportConfirmation>,
    @Inject(MAT_DIALOG_DATA) public data
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}

