import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_invitations_create } from "../../../generate/generate_random_hrm_member_invitations_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_employee_invitation } from "../../../prepare/prepare_random_hrm_employee_invitation";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test that an employee without time:approve permission is blocked from retrieving another employee's timesheet.
 *
 * Validates the access control enforcement on the timesheet retrieval endpoint. Only timesheet owners or users with time:approve permission should be able to view timesheets. This test ensures that employees with the basic Employee role cannot access other employees' timesheets.
 *
 * The test creates two employees in the same organization with the Employee role, creates a timesheet owned by the first employee, and verifies that the second employee receives a 403 Forbidden response when attempting to retrieve the timesheet.
 *
 * 1. Create organization owner account and authenticate.
 * 2. Create invitation for first employee (timesheet owner) with Employee role.
 * 3. First employee accepts invitation and authenticates.
 * 4. Create invitation for second employee (access requester) with Employee role.
 * 5. Second employee accepts invitation and authenticates.
 * 6. Create a timesheet owned by the first employee.
 * 7. Attempt to retrieve the timesheet using second employee's connection.
 * 8. Validate 403 Forbidden response is returned.
 */
export async function test_api_timesheet_retrieve_blocked_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create invitation for first employee (timesheet owner)
  const employee1Invitation: IHrmEmployeeInvitation =
    await generate_random_hrm_member_invitations_create(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmEmployeeInvitation.ICreate,
    });
  typia.assert(employee1Invitation);
  // 3. First employee accepts invitation
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1Auth = await api.functional.hrm.auth.member.join(
    employee1Connection,
    {
      body: {
        email: employee1Invitation.email,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(employee1Auth);
  // Accept the invitation
  const employee1InvitationAccepted: IHrmEmployeeInvitation =
    await api.functional.hrm.member.invitations.accept(employee1Connection, {
      invitationId: employee1Invitation.id,
      body: {
        token: employee1Invitation.token,
      } satisfies IHrmEmployeeInvitation.IAccept,
    });
  typia.assert(employee1InvitationAccepted);
  // 4. Create invitation for second employee (access requester)
  const employee2Invitation: IHrmEmployeeInvitation =
    await generate_random_hrm_member_invitations_create(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmEmployeeInvitation.ICreate,
    });
  typia.assert(employee2Invitation);
  // 5. Second employee accepts invitation
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2Auth = await api.functional.hrm.auth.member.join(
    employee2Connection,
    {
      body: {
        email: employee2Invitation.email,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(employee2Auth);
  // Accept the invitation
  const employee2InvitationAccepted: IHrmEmployeeInvitation =
    await api.functional.hrm.member.invitations.accept(employee2Connection, {
      invitationId: employee2Invitation.id,
      body: {
        token: employee2Invitation.token,
      } satisfies IHrmEmployeeInvitation.IAccept,
    });
  typia.assert(employee2InvitationAccepted);
  // 6. Create a timesheet owned by the first employee
  // Get organizationId from the accepted invitation
  const organizationId: string = employee1InvitationAccepted.organization.id;
  const employeeId: string = employee1InvitationAccepted.member!.id;
  const timesheet: IHrmTimesheetTimelog =
    await generate_random_hrm_member_organizations_timesheets_create(
      employee1Connection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: new Date().toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timesheet);
  // 7. Attempt to retrieve the timesheet using second employee's connection
  // 8. Validate 403 Forbidden response
  await TestValidator.httpError(
    "employee without time:approve permission should be blocked from retrieving another employee's timesheet",
    403,
    async () => {
      await api.functional.hrm.member.organizations.timesheets.at(
        employee2Connection,
        {
          organizationId,
          timesheetId: timesheet.id,
        },
      );
    },
  );
}
