import { ReportListPipe } from './../shared/pipes/report-list.pipe';
import { SearchNamePipe } from './../shared/pipes/search-name.pipe';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './admin.component';
import { OrganizationListComponent } from './organization/organization-list/organization-list.component';
import { AngularMaterialModule } from '../../angular-material/angular-material.module';
import { AdminRoutingModule } from './admin-routing.module';
import { OrganizationDetailsComponent } from './organization-details/organization-details.component';
import { OrganizationComponent } from './organization/organization.component';
import { UserDetailsComponent } from './user-details/user-details.component';
import { AdminReportDetailsComponent } from './admin-report-details/admin-report-details.component';
import { UserListComponent } from '../shared/common-view/user-list/user-list.component';
import { ReportListComponent } from '../shared/common-view/report-list/report-list.component';
import { AllUsersComponent } from './all-users/all-users.component';
import { AllReportsComponent } from './all-reports/all-reports.component';
import { AllUserListComponent } from './all-users/all-user-list/all-user-list.component';
import { AllReportListComponent } from './all-reports/all-report-list/all-report-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaginationPipe } from '../shared/pipes/pagination.pipe';
import { OrgListPipe } from '../shared/pipes/org-list.pipe';
import { UserListPipe } from '../shared/pipes/user-list.pipe';
import { DataRulesListPipe } from '../shared/pipes/datarules-list.pipe';

@NgModule({
  declarations: [
    AdminComponent,
    OrganizationListComponent,
    OrganizationDetailsComponent,
    OrganizationComponent,
    UserDetailsComponent,
    AdminReportDetailsComponent,
    UserListComponent,
    ReportListComponent,
    AllUsersComponent,
    AllReportsComponent,
    AllUserListComponent,
    AllReportListComponent,
    SearchNamePipe,
    PaginationPipe,
    OrgListPipe,
    ReportListPipe,
    UserListPipe,
    DataRulesListPipe


  ],
  imports: [CommonModule, AdminRoutingModule, AngularMaterialModule, FormsModule, ReactiveFormsModule]
})
export class AdminModule {}
