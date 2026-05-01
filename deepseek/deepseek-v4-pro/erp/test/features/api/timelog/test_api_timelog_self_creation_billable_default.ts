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
 * Test that an employee creating a timelog with minimum required fields gets the billable flag defaulted to true.
 *
 * Validates the server-side default behavior for the billable flag on timelog creation. The test sets up a complete dependency chain — member registration, custom role creation, employee record creation, project creation, and project membership assignment — then creates a timelog using only the three required fields (project_id, date, duration_minutes) while intentionally omitting the optional billable flag.
 *
 * The response is validated to confirm that the billable flag defaults to true, the timesheet and deleted_at fields are both null (indicating a newly created, ungrouped, and active timelog), the duration_minutes matches the submitted value exactly, and the returned date matches the submitted calendar date.
 *
 * 1. Register a new member via authorize_member_join to obtain an authenticated session.
 * 2. Create a custom role in the organization for employee assignment.
 * 3. Create an employee record for the authenticated member using the custom role.
 * 4. Create an active project for timelog tracking.
 * 5. Assign the employee as a project member to authorize timelog creation.
 * 6. Create a timelog with only project_id, date, and duration_minutes — billable is intentionally omitted.
 * 7. Validate billable defaults to true, timesheet and deleted_at are null, and submitted values are preserved.
 */
export async function test_api_timelog_self_creation_billable_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 2. Create a custom role for the organization
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  // 3. Create an employee record for the authenticated member
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        email: memberAuth.email,
        erp_hrm_role_id: role.id,
        employment_type: "full-time",
      },
    },
  );
  // 4. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 5. Assign the employee as a project member
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { erp_hrm_employee_id: employee.id },
    },
  );
  // 6. Create a timelog with minimum required fields, billable intentionally omitted
  const date = new Date().toISOString().substring(0, 10);
  const durationMinutes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const timelog = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date,
        duration_minutes: durationMinutes,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Validate business logic — billable default, null relations, and submitted value preservation
  TestValidator.equals(
    "billable defaults to true when omitted from request",
    timelog.billable,
    true,
  );
  TestValidator.equals(
    "timesheet is null for an ungrouped timelog",
    timelog.timesheet,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for an active timelog",
    timelog.deleted_at,
    null,
  );
  TestValidator.equals(
    "duration_minutes matches the submitted value",
    timelog.duration_minutes,
    durationMinutes,
  );
  TestValidator.equals(
    "date matches the submitted calendar date",
    timelog.date.substring(0, 10),
    date,
  );
}
