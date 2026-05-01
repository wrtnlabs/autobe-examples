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
 * Test that an authenticated employee can start a live time tracking timer with a project reference and work description.
 *
 * Validates the complete flow from organization setup through timer creation, ensuring that a properly authenticated employee who is a project member can start a timer that correctly records ownership, project reference, and description. The test confirms that when no task ID is provided, the task field remains null.
 *
 * 1. Register a new member account via join and authenticate.
 * 2. Create a custom role within the organization.
 * 3. Create an employee record linked to the authenticated member with the custom role.
 * 4. Create an active project for time tracking.
 * 5. Assign the employee as a project member of the newly created project.
 * 6. Start a timer with the project ID and description "Working on frontend redesign", explicitly providing no task ID.
 * 7. Validate the timer response: employee ownership matches, project reference is correct, description is preserved exactly, task is null, and start timestamp is set.
 */
export async function test_api_timer_creation_with_project_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // 2. Create a custom role
  const role: IErpHrmRole = await generate_random_erp_hrm_roles_create(
    memberConnection,
    {},
  );
  typia.assert(role);
  // 3. Create an employee record linked to the authenticated member
  const employee: IErpHrmEmployee =
    await generate_random_erp_hrm_member_employees_create(memberConnection, {
      body: {
        email: member.email,
        erp_hrm_role_id: role.id,
      },
    });
  typia.assert(employee);
  // 4. Create an active project
  const project: IErpHrmProject =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {});
  typia.assert(project);
  // 5. Assign the employee as a project member
  const projectMember: IErpHrmProjectMember =
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
    );
  typia.assert(projectMember);
  // 6. Start a timer with project and description, no task
  const timer: IErpHrmTimer =
    await generate_random_erp_hrm_member_timers_create(memberConnection, {
      body: {
        erp_hrm_project_id: project.id,
        erp_hrm_task_id: null,
        description: "Working on frontend redesign",
      },
    });
  typia.assert(timer);
  // 7. Validate timer business logic
  TestValidator.predicate(
    "start timestamp is set to server time",
    () => !!timer.start_timestamp,
  );
  TestValidator.equals(
    "employee ownership matches authenticated member",
    timer.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project reference is correct",
    timer.project.id,
    project.id,
  );
  TestValidator.equals(
    "description preserved exactly as submitted",
    timer.description,
    "Working on frontend redesign",
  );
  TestValidator.equals(
    "no task assigned when task ID omitted",
    timer.task,
    null,
  );
}
