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
 * Test that an employee can successfully discard a running timer and start a new one.
 *
 * Validates the complete timer discard flow: starting a live time tracking session, discarding it via the discard endpoint, and confirming the active-timer constraint is released. The discard operation permanently removes the timer record without creating any timelog entry — the elapsed time is lost permanently with no audit trail.
 *
 * 1. Member joins the platform and is automatically authenticated with owner privileges.
 * 2. Owner creates a custom role for employee assignment within the organization.
 * 3. Owner creates an employee record explicitly matching the authenticated member's email, ensuring the employee is the same person who will start and discard timers.
 * 4. Owner creates a project to track time against.
 * 5. Owner adds the employee as a project member so they can start timers.
 * 6. Employee starts a running timer against the project.
 * 7. Employee discards the running timer — the discard endpoint returns void, confirming the timer is permanently removed.
 * 8. Employee starts a new timer against the same project, confirming the active-timer unique constraint is released after the discard.
 */
export async function test_api_timer_discard_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create role
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
  // 4. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Add employee as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { erp_hrm_employee_id: employee.id },
      },
    );
  typia.assert(projectMember);
  // 6. Start timer
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: { erp_hrm_project_id: project.id },
    },
  );
  typia.assert(timer);
  // 7. Discard the timer
  await api.functional.erpHrm.member.timers.discard(memberConnection, {
    timerId: timer.id,
  });
  // 8. Start a new timer to confirm active-timer constraint is released
  const newTimer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: { erp_hrm_project_id: project.id },
    },
  );
  typia.assert(newTimer);
}
