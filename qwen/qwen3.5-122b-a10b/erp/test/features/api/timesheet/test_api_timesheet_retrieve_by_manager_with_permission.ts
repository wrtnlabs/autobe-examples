import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
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
import { generate_random_hrm_member_organizations_roles_create } from "../../../generate/generate_random_hrm_member_organizations_roles_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_employee_invitation } from "../../../prepare/prepare_random_hrm_employee_invitation";
import { prepare_random_hrm_role } from "../../../prepare/prepare_random_hrm_role";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

export async function test_api_timesheet_retrieve_by_manager_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member as organization owner
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
  // 2. Create custom role with time:approve permission for manager
  const managerRole =
    await generate_random_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: "Manager",
          description: "Manager role with time approval permissions",
        } satisfies IHrmRole.ICreate,
      },
    );
  typia.assert(managerRole);
  // 3. Invite first employee (timesheet owner) with regular Employee role
  const employeeInvitation =
    await generate_random_hrm_member_invitations_create(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        role_id: managerRole.organization.id, // Use organization ID from role
      } satisfies IHrmEmployeeInvitation.ICreate,
    });
  typia.assert(employeeInvitation);
  // 4. Register first employee and accept invitation
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeInvitation.email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  const acceptedEmployeeInvitation =
    await api.functional.hrm.member.invitations.accept(employeeConnection, {
      invitationId: employeeInvitation.id,
      body: {
        token: employeeInvitation.token,
      } satisfies IHrmEmployeeInvitation.IAccept,
    });
  typia.assert(acceptedEmployeeInvitation);
  TestValidator.equals(
    "invitation accepted",
    acceptedEmployeeInvitation.status,
    "accepted",
  );
  // 5. Register second member who will be the manager
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 6. Invite second employee with custom manager role
  const managerInvitation = await generate_random_hrm_member_invitations_create(
    ownerConnection,
    {
      body: {
        email: managerAuth.email,
        role_id: managerRole.id,
      } satisfies IHrmEmployeeInvitation.ICreate,
    },
  );
  typia.assert(managerInvitation);
  // 7. Accept invitation for manager employee
  const acceptedManagerInvitation =
    await api.functional.hrm.member.invitations.accept(managerConnection, {
      invitationId: managerInvitation.id,
      body: {
        token: managerInvitation.token,
      } satisfies IHrmEmployeeInvitation.IAccept,
    });
  typia.assert(acceptedManagerInvitation);
  TestValidator.equals(
    "manager invitation accepted",
    acceptedManagerInvitation.status,
    "accepted",
  );
  // 8. Create a timesheet for the first employee
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      employeeConnection,
      {
        body: {
          hrm_employee_id: acceptedEmployeeInvitation.member!.id,
          week_start_date: new Date().toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: {
          organizationId: managerRole.organization.id,
        },
      },
    );
  typia.assert(timesheet);
  // 9. Manager retrieves the timesheet and validates access
  const retrievedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.at(
      managerConnection,
      {
        organizationId: managerRole.organization.id,
        timesheetId: timesheet.id,
      },
    );
  typia.assert(retrievedTimesheet);
  // 10. Verify timesheet contains timelog details and correct ownership
  TestValidator.equals(
    "timesheet owner matches",
    retrievedTimesheet.employee.id,
    acceptedEmployeeInvitation.member!.id,
  );
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.predicate(
    "timesheet has week start date",
    retrievedTimesheet.week_start_date !== null,
  );
  TestValidator.predicate(
    "timesheet has week end date",
    retrievedTimesheet.week_end_date !== null,
  );
}
