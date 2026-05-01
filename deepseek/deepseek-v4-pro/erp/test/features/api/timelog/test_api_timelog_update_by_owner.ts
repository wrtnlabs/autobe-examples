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
 * Test timelog update by its owner — an employee correcting their own ungrouped time entry.
 *
 * Validates the core update functionality where a timelog owner modifies a freely-editable timelog that belongs to no timesheet. The test covers the full setup chain: member authentication, custom role provisioning, employee record creation, project creation, project member assignment, and initial timelog creation — then exercises the PUT endpoint to change duration, description, billable status, and date.
 *
 * 1. A member joins and creates a custom role with permissions.
 * 2. The member creates their own employee record using the custom role.
 * 3. An active project is created and the employee is assigned as a member.
 * 4. A timelog is created against the project with known initial values.
 * 5. The timelog is updated with new duration, description, billable flag, and date.
 * 6. Validates that updated fields reflect the new values, while id and project reference remain unchanged, and updated_at advances.
 */
export async function test_api_timelog_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create an employee record for the member
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
  // 5. Assign employee as a project member
  typia.assert(
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          erp_hrm_employee_id: employee.id,
        },
        params: {
          projectId: project.id,
        },
      },
    ),
  );
  // 6. Create the initial timelog
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        duration_minutes: 60,
        billable: true,
        description: "Original work description",
      },
    },
  );
  typia.assert(timelog);
  // 7. Update the timelog with new values
  const updatedDate = new Date(Date.UTC(2025, 4, 15)).toISOString();
  const updated = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: timelog.id,
      body: {
        date: updatedDate,
        duration_minutes: 120,
        project_id: project.id,
        billable: false,
        description: "Corrected work description with additional details",
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  typia.assert(updated);
  // 8. Validate the updated timelog
  TestValidator.equals("timelog id preserved", updated.id, timelog.id);
  TestValidator.equals(
    "duration updated to 120",
    updated.duration_minutes,
    120,
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    "Corrected work description with additional details",
  );
  TestValidator.equals("billable toggled to false", updated.billable, false);
  TestValidator.equals(
    "project reference preserved",
    updated.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee reference preserved",
    updated.employee.id,
    employee.id,
  );
  TestValidator.notEquals(
    "updated_at advanced",
    updated.updated_at,
    timelog.updated_at,
  );
  TestValidator.equals("timesheet still null", updated.timesheet, null);
}
