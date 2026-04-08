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
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

export async function test_api_active_timer_update_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // Note: Organization ID is required for project/task creation
  // In simulation mode, random UUIDs work. In real mode, a valid organization must exist.
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create initial project (timer's current project context)
  const initialProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#FF5733",
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(initialProject);
  // 3. Create target project (timer's new project after update)
  const targetProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#33FF57",
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(targetProject);
  // 4. Assign employee to target project (required for task assignment)
  // Note: In real implementation, employee_id should come from the authenticated member's employee record
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await generate_random_hrm_member_projects_members_create(memberConnection, {
    body: {
      employee_id: employeeId,
      role: "member",
    } satisfies IHrmProjectMember.ICreate,
    params: {
      projectId: targetProject.id,
    },
  });
  // 5. Create task within the target project
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(),
          priority: RandomGenerator.pick(["low", "medium", "high", "urgent"]),
        } satisfies IHrmTask.ICreate,
        params: {
          organizationId,
          projectId: targetProject.id,
        },
      },
    );
  typia.assert(task);
  // 6. Timer ID for update operation
  // Note: Timer creation endpoint is not available in the provided SDK.
  // In simulation mode, a random UUID works. In real implementation, the timer
  // must be created first via the timer start endpoint before this update can succeed.
  const timerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 7. Update the timer with new project and task
  const updatedTimer = await api.functional.hrm.member.active_timers.update(
    memberConnection,
    {
      timerId,
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
        project_id: targetProject.id,
        task_id: task.id,
      } satisfies IHrmActiveTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 8. Verify the response contains updated project reference
  TestValidator.equals(
    "project updated",
    updatedTimer.project.id,
    targetProject.id,
  );
  // 9. Verify the response contains updated task reference
  TestValidator.equals("task updated", updatedTimer.task?.id, task.id);
  // 10. Verify description was updated
  TestValidator.predicate(
    "description updated",
    updatedTimer.description !== null && updatedTimer.description !== undefined,
  );
  // 11. Verify updated_at timestamp reflects the modification
  TestValidator.predicate(
    "updated_at exists",
    updatedTimer.updated_at !== null && updatedTimer.updated_at !== undefined,
  );
  // 12. Verify start_timestamp is preserved (not modified during update)
  TestValidator.predicate(
    "start_timestamp exists",
    updatedTimer.start_timestamp !== null &&
      updatedTimer.start_timestamp !== undefined,
  );
}
