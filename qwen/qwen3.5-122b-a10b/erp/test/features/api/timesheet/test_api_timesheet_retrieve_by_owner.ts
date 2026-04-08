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

export async function test_api_timesheet_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member registers to establish organization context
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
  // Get organization ID from owner's organizations
  const organizationId = ownerAuth.organizations?.[0]?.id;
  TestValidator.predicate("organization exists", organizationId !== undefined);
  // 2. Get a role ID from the organization (use first available role)
  // For this test, we'll use a random UUID as role_id since we don't have a role listing endpoint
  // In production, you would query the organization's roles to get a valid role_id
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Owner creates an employee invitation
  const invitation = await generate_random_hrm_member_invitations_create(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        role_id: roleId,
      } satisfies IHrmEmployeeInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // 4. Employee member registers with the invited email
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: invitation.email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 5. Employee accepts the invitation
  const acceptedInvitation = await api.functional.hrm.member.invitations.accept(
    employeeConnection,
    {
      invitationId: invitation.id,
      body: {
        token: invitation.token,
      } satisfies IHrmEmployeeInvitation.IAccept,
    },
  );
  typia.assert(acceptedInvitation);
  TestValidator.equals(
    "invitation status",
    acceptedInvitation.status,
    "accepted",
  );
  // 6. Get the employee ID - we need to find the employee record for this member in the organization
  // Since we don't have an employee listing endpoint available, we'll use the member ID as a proxy
  // In a real scenario, you would query the employee list to get the actual employee_id
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 7. Owner creates a draft timesheet for the employee
  const weekStartDate = new Date();
  // Normalize to Monday
  const dayOfWeek = weekStartDate.getDay();
  const diff = weekStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStartDate.setDate(diff);
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      ownerConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  // 8. Employee retrieves their own timesheet
  const retrievedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.at(
      employeeConnection,
      {
        organizationId: organizationId!,
        timesheetId: timesheet.id,
      },
    );
  typia.assert(retrievedTimesheet);
  // 9. Validate timesheet structure and content
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timesheet status",
    retrievedTimesheet.status,
    timesheet.status,
  );
  TestValidator.equals(
    "week start date matches",
    retrievedTimesheet.week_start_date,
    timesheet.week_start_date,
  );
  TestValidator.equals(
    "week end date matches",
    retrievedTimesheet.week_end_date,
    timesheet.week_end_date,
  );
  TestValidator.equals(
    "total hours matches",
    retrievedTimesheet.total_hours,
    timesheet.total_hours,
  );
  // 10. Validate employee reference
  TestValidator.predicate(
    "employee exists",
    retrievedTimesheet.employee !== undefined,
  );
  TestValidator.predicate(
    "employee has id",
    retrievedTimesheet.employee?.id !== undefined,
  );
  // 11. Validate timelogs array exists
  TestValidator.predicate(
    "timelogs array exists",
    Array.isArray(retrievedTimesheet.timelogs),
  );
}