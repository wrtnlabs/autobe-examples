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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test duplicate active timer rejection for an employee.
 *
 * Validates the business rule that an employee is limited to at most one active timer at any given moment. The test sets up the full dependency chain — member registration, role creation, employee record establishment, project creation, and project membership assignment — then starts a first timer successfully. A second timer creation attempt is made without stopping or discarding the first, and the system must reject it with a 409 Conflict response.
 *
 * 1. Register a new member who serves as both organization owner and the employee performing time tracking.
 * 2. Create a custom role within the organization for role assignment.
 * 3. Create an employee record linking the member to the organization with the newly created role.
 * 4. Create an active project for time tracking.
 * 5. Assign the employee as a project member so timer validation passes.
 * 6. Start the first timer against the project — verify success with typia.assert on the response.
 * 7. Attempt to start a second timer while the first is still active — expect 409 Conflict.
 */
export async function test_api_timer_duplicate_active_timer_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (creates organization and owner employee record)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a custom role within the organization
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create an employee record linked to this member
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    { body: { email: member.email, erp_hrm_role_id: role.id } },
  );
  typia.assert(employee);
  // 4. Create an active project for time tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign the employee as a project member
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: { erp_hrm_employee_id: employee.id },
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  // 6. Start the first timer — must succeed
  const firstTimer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    { body: { erp_hrm_project_id: project.id } },
  );
  typia.assert(firstTimer);
  // 7. Attempt to start a second timer — expect 409 Conflict
  await TestValidator.httpError(
    "duplicate active timer should be rejected with 409",
    409,
    async () => {
      await generate_random_erp_hrm_member_timers_create(memberConnection, {
        body: { erp_hrm_project_id: project.id },
      });
    },
  );
}
