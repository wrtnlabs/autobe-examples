import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test that an authenticated employee can create a non-billable timelog entry.
 *
 * Validates that when `billable` is explicitly set to `false` during timelog creation, the server respects this value rather than applying its default of `true`. Non-billable timelogs represent internal meetings, administrative tasks, or other work that is not charged to clients.
 *
 * The timelog is created as an ungrouped entry — it is not associated with any timesheet and is not soft-deleted. The employee reference correctly reflects the authenticated user from the session, and all required fields (project_id, date, duration_minutes) are populated in the response.
 *
 * 1. Register and authenticate a new member account with randomized credentials.
 * 2. Create a custom role within the organization for the employee's role assignment.
 * 3. Create an employee record for the authenticated member using the member's email and the custom role ID.
 * 4. Create an active project to serve as the target for time logging.
 * 5. Assign the employee as a project member so they are authorized to log time.
 * 6. Create a timelog with `billable` explicitly set to `false`, overriding the server default of `true`.
 * 7. Validate that `billable` is `false`, `timesheet` and `deleted_at` are `null`, and the employee/project references are correct.
 */
export async function test_api_timelog_self_creation_non_billable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create employee record for the authenticated member
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        email: member.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign the employee as a project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { erp_hrm_employee_id: employee.id },
      },
    );
  typia.assert(projectMember);
  // 6. Create a timelog with billable explicitly set to false
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        billable: false,
      },
    },
  );
  typia.assert(timelog);
  // 7. Validate the non-billable timelog
  TestValidator.equals("billable should be false", timelog.billable, false);
  TestValidator.equals("timesheet should be null", timelog.timesheet, null);
  TestValidator.equals("deleted_at should be null", timelog.deleted_at, null);
  TestValidator.equals("employee id matches", timelog.employee.id, employee.id);
  TestValidator.equals("project id matches", timelog.project.id, project.id);
}
