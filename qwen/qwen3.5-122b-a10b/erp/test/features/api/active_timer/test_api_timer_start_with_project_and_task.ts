import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_active_timers_create } from "../../../generate/generate_random_hrm_member_active_timers_create";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_active_timer } from "../../../prepare/prepare_random_hrm_active_timer";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

/**
 * Test timer start with project and task selection.
 *
 * Validates the complete happy path for initiating a live timer session where an employee tracks time against a specific project and task. The test ensures proper authentication, project membership, task association, and timer record creation with all required fields.
 *
 * This test follows the natural workflow of time tracking:
 * 1. Member registration and authentication
 * 2. Project creation within the organization
 * 3. Employee assignment to the project as a member
 * 4. Task creation within the project
 * 5. Timer start with project and task selection
 * 6. Validation of timer record structure and field values
 *
 * 1. Register and authenticate a member with email/password credentials.
 * 2. Create a project within the member's organization with name, color code, and active status.
 * 3. Assign an employee to the project with member role (employee_id generated for testing).
 * 4. Create a task within the project with title and priority.
 * 5. Start a timer with projectId, taskId, and optional description.
 * 6. Validates timer response contains:
 *    - Valid UUID id
 *    - Employee reference from authenticated context
 *    - Matching project_id from request
 *    - Matching task_id from request
 *    - start_timestamp set to current time
 *    - created_at and updated_at timestamps
 *    - Optional description field if provided
 */
export async function test_api_timer_start_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Get organization from login response
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Member has no organization context");
  }
  // 2. Create project within organization
  const project: IHrmProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId,
        },
        body: {
          name: RandomGenerator.name(2),
          color_code: "#3B82F6",
          status: "active",
        },
      },
    );
  typia.assert(project);
  // 3. Assign employee to project as member
  // Note: employee_id is generated for testing since employee creation endpoints are not available in SDK
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const projectMember: IHrmProjectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: {
        projectId: project.id,
      },
      body: {
        employee_id: employeeId,
        role: "member",
      },
    });
  typia.assert(projectMember);
  // 4. Create task within project
  const task: IHrmTask =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        params: {
          organizationId,
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.name(2),
          priority: "medium",
          status: "open",
        },
      },
    );
  typia.assert(task);
  // 5. Start timer with project and task
  const timerDescription = RandomGenerator.paragraph({ sentences: 3 });
  const activeTimer: IHrmActiveTimer =
    await generate_random_hrm_member_active_timers_create(memberConnection, {
      body: {
        projectId: project.id,
        taskId: task.id,
        description: timerDescription,
      },
    });
  typia.assert(activeTimer);
  // 6. Validate timer response
  TestValidator.equals("timer id is uuid", activeTimer.id.length, 36);
  TestValidator.equals("project matches", activeTimer.project.id, project.id);
  TestValidator.equals("task matches", activeTimer.task?.id, task.id);
  TestValidator.equals(
    "description matches",
    activeTimer.description,
    timerDescription,
  );
  TestValidator.predicate(
    "has start timestamp",
    activeTimer.start_timestamp !== null,
  );
  TestValidator.predicate(
    "has created timestamp",
    activeTimer.created_at !== null,
  );
  TestValidator.predicate(
    "has updated timestamp",
    activeTimer.updated_at !== null,
  );
}
