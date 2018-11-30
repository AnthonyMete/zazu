import { NewUserOrganizationConfirmation } from './../create-new-user/create-new-user.component';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from './../../shared/services/organization.service';
import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import * as OrganizationViewModel from './../../shared/view-models/organization.viewmodel';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl
} from '@angular/forms';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatStepper,
  MatSnackBar
} from '@angular/material';
import * as UserViewModel from '../../shared/view-models/user.viewmodel';
import { UserService } from 'src/app/shared/services/user.service';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.scss']
})
export class EditUserComponent implements OnInit {
  constructor(
    private organizationService: OrganizationService,
    private formBuilder: FormBuilder,
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    public snackBar: MatSnackBar
  ) {}
  sub: any;
  roleSelected;
  organizations: OrganizationViewModel.SimpleOrganization[];
  selectedOrganizationIds: string[] = [];
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  selectedOrganizationNames: OrganizationViewModel.SimpleOrganization[];
  organizationID;
  userID: string;
  user: UserViewModel.User;
  userRole;
  sending = false;

  tooltip = {
    role: 'Viewer access provides users the ability to view reports that are shared with them. Warning! Admin access provides the user with full access to create, update and edit reports.Admin access should only be provided to users who have full access to the data.',
    organization: 'Select one or many organizations this user is permitted to access',
    first : 'Enter the user\'s first name',
    last: 'Enter the user\'s last name',
    gmail: 'Specify the user’s Google Account.  A Google account is required to allow the user to log in as well as view the reports.',
    secondary: '(Optional) Add another email address for this user. Doesn\'t have to be a Google Account'
  };

  async ngOnInit() {
    try {
      this.organizations = await this.organizationService.getAllOrganizationsWithNoDetails();
      console.log(this.organizations);
      this.sub = this.route.params.subscribe(params => {
        this.organizationID = params['id'];
        this.userID = params['userID'];
      });
      this.user = await this.userService.getUser(this.userID);
      for await (const org of this.user.organizations) {
        this.selectedOrganizationIds.push(org._id);
      }
      this.firstFormGroup = await this.formBuilder.group({
        firstName: [
          this.user.firstName,
          [Validators.required, this.noWhitespaceValidator]
        ],
        lastName: [
          this.user.lastName,
          [Validators.required, this.noWhitespaceValidator]
        ],
        secondaryEmail: [this.user.secondaryEmail, Validators.email]
      });
      this.userRole = this.user.role;
      if (this.user.role === 'admin') {
        this.firstFormGroup.removeControl('organizations');
      }
      if (this.user.role === 'viewer') {
        this.firstFormGroup.addControl(
          'organizations',
          new FormControl('', Validators.required)
        );
      }
      console.log(this.firstFormGroup);
    } catch (error) {
      console.log(error);
    }
  }
  /*
  checkRole() {
    if (this.roleSelected === 'admin') {
      this.firstFormGroup.removeControl('organizations');
    }
    if (this.roleSelected === 'viewer') {
      this.firstFormGroup.addControl(
        'organizations',
        new FormControl('', Validators.required)
      );
    }
  }

  adminRolePressed() {
    if (this.userRole === 'viewer') {
      this.firstFormGroup.removeControl('organizations');
    }
    this.userRole = 'admin';
  }

  viewerCalled() {
    if (this.userRole === 'admin') {
      this.firstFormGroup.addControl(
        'organizations',
        new FormControl('', Validators.required)
      );
    }
    this.userRole = 'viewer';
  }
  */

  /**
   * ON SUBMIT FOR CREATING NEW USER
   */
  async onSubmit() {
    try {
      console.log('Submit Called');
      this.sending = true;
      const firstForm = this.firstFormGroup.value;
      const orgs = [];
      console.log('On Submit called');
      let newUser: UserViewModel.EditUser;
      if (this.user.role === 'viewer') {
        for (const orgID of firstForm.organizations) {
          orgs.push(
            this.organizations.find(org => {
              return org._id === orgID;
            })
          );
        }
        newUser = {
          _id: this.userID,
          firstName: firstForm.firstName,
          lastName: firstForm.lastName,
          googleID: this.user.googleID,
          secondaryEmail: firstForm.secondaryEmail,
          organizations: orgs,
          role: this.user.role
        };
      }
      if (this.user.role === 'admin') {
        newUser = {
          _id: this.userID,
          firstName: firstForm.firstName,
          lastName: firstForm.lastName,
          googleID: firstForm.email,
          secondaryEmail: firstForm.secondaryEmail,
          organizations: this.user.organizations,
          role: this.user.role
        };
      }
      const oldUser = this.user;
      // console.log(oldUser);
      // console.log(newUser);
      const status = await <any>this.userService.editUser(oldUser, newUser);
      if (status.status === '200') {
        await this.router.navigate(['../'], { relativeTo: this.route, queryParams: { edited: 'true'}} );
      } else {
        this.sending = false;
        this.snackBar.open('Error: ' + status.message, 'Dismiss', {
          duration: 5000,
        });
      }
    } catch (error) {

    }
  }
  /*
  openDialog() {
    const dialogRef = this.dialog.open(NewUserOrganizationConfirmation, {
      data: { orgs: '', role: 'admin' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.adminRolePressed();
      } else {
        this.firstFormGroup.controls['role'].setValue('Viewer');
        this.viewerCalled();
      }
    });
  }
  */

  public noWhitespaceValidator(control: FormControl) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { whitespace: true };
  }
}
