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
 * Test that a non-owner employee cannot retrieve another employee's running timer.
 *
 * Validates the strict owner-exclusive access rule for timers where only the timer owner may view their own running timer. No other user within the same organization — including other employees — can access another employee's active timer, enforcing the access restriction from section 388.
 *
 * 1. Employee A registers and creates a role with employee:manage and project:manage permissions.
 * 2. Employee A creates their employee record and a project for time tracking.
 * 3. Employee A becomes a project member and starts a running timer.
 * 4. Employee B registers and creates their employee record in the same organization.
 * 5. Employee B attempts to retrieve Employee A's timer — the system rejects with 403 Forbidden.
 */
export async function test_api_timer_retrieve_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee A joins
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeAAuthorized = await authorize_member_join(
    employeeAConnection,
    {},
  );
  typia.assert(employeeAAuthorized);
  // 2. Create role with employee:manage and project:manage permissions
  const role = await generate_random_erp_hrm_roles_create(employeeAConnection, {
    body: {
      permissions: ["employee:manage", "project:manage"],
    },
  });
  typia.assert(role);
  // 3. Create Employee A record
  const employeeA = await generate_random_erp_hrm_member_employees_create(
    employeeAConnection,
    {
      body: {
        email: employeeAAuthorized.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employeeA);
  // 4. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeAConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign Employee A as project member
  await generate_random_erp_hrm_member_projects_members_create(
    employeeAConnection,
    {
      params: { projectId: project.id },
      body: {
        erp_hrm_employee_id: employeeA.id,
      },
    },
  );
  // 6. Employee A starts a timer
  const timerA = await generate_random_erp_hrm_member_timers_create(
    employeeAConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
      },
    },
  );
  typia.assert(timerA);
  // 7. Employee B joins
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeBAuthorized = await authorize_member_join(
    employeeBConnection,
    {},
  );
  typia.assert(employeeBAuthorized);
  // 8. Create Employee B record
  await generate_random_erp_hrm_member_employees_create(employeeBConnection, {
    body: {
      email: employeeBAuthorized.email,
      erp_hrm_role_id: role.id,
    },
  });
  // 9. Employee B attempts to retrieve Employee A's timer — must be 403
  await TestValidator.httpError(
    "non-owner cannot retrieve timer",
    403,
    async () => {
      await api.functional.erpHrm.member.timers.at(employeeBConnection, {
        timerId: timerA.id,
      });
    },
  );
}
