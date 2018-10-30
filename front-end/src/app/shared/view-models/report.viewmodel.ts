import * as OrganizationViewModel from './organization.viewmodel';
import * as UserViewModel from './user.viewmodel';
import * as DataViewModel from './data.viewmodel';


  // What I expect to get back for Viewer Report Details
  export interface Report {
    _id: string;
    name: string;
    link: string;
    organization: OrganizationViewModel.SimpleOrganization;
    datasources: DataViewModel.DataSource[];
    date: Date;
  }

  // What I expect to get back for the report list
  // Also used for searching & filtering
  export interface SimpleReport {
    _id: string;
    name: string;
    organization: OrganizationViewModel.SimpleOrganization;
    date: Date;
  }

  // What I expect to get back when getting the report with meta data in Admin Report Details
  export interface ReportWithMetaData {
    _id: string;
    name: string;
    link: string;
    organization: OrganizationViewModel.SimpleOrganization;
    datasources: DataViewModel.DataSource[];
    date: Date;
    createdBy: string;
    updatedBy: string;
    accessedBy: UserViewModel.SimpleUserView[];
  }

  // View Model for creating new report
  export interface CreateNewReport {
    name: string;
    datastudioLink: string;
    organizationID: string;
    datasources: DataViewModel.DataSource[];
  }

  // View Model for editing report
  export interface EditReport {
    _id: string;
    name: string;
    datastudioLink: string;
    organizationID: string;
    datasources: DataViewModel.DataSource[];
  }

  // View Model for deleteing report
  export interface DeleteReport {
    _id: string;
}
