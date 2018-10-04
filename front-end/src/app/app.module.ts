import { AdminGuard } from './auth/admin-guard.service';
import { AuthService } from './auth/auth.service';
import { AppRoutingModule } from './app-routing.module';
import { AngularMaterialModule } from './../angular-material/angular-material.module';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './auth/login/login.component';
import { UserComponent } from './user/user.component';
import { UserService } from './shared/services/user.service';
import { ReportService } from './shared/services/report.service';
import { OrganizationService } from './shared/services/organization.service';
import { UserListComponent } from './shared/common-view/user-list/user-list.component';
import { ReportListComponent } from './shared/common-view/report-list/report-list.component';
import { ReportDetailsComponent } from './shared/common-view/report-details/report-details.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    UserComponent,
    UserListComponent,
    ReportListComponent,
    ReportDetailsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AngularMaterialModule,
    AppRoutingModule,
    HttpClientModule,
  ],
  providers: [AuthService, AdminGuard, UserService, ReportService, OrganizationService],
  bootstrap: [AppComponent]
})
export class AppModule { }
