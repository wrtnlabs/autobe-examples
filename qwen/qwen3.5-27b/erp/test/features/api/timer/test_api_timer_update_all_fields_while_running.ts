import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test updating all modifiable fields of an active timer simultaneously.
 *
 * This test validates that an active timer can be updated with new description,
 * project, and task assignments in a single operation. It verifies that:
 * - All three fields can be updated together
 * - The timer remains active after update
 * - The original start timestamp is preserved
 * - The updated_at timestamp is refreshed
 * - Employee ownership is maintained
 */
export async function test_api_timer_update_all_fields_while_running(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create first project
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project1);
  // 3. Create second project
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project2);
  // 4. Assign employee to first project
  const membership1 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project1.id },
        body: {
          employee_id: authorized.id,
          role: "member",
        },
      },
    );
  typia.assert(membership1);
  // 5. Assign employee to second project
  const membership2 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project2.id },
        body: {
          employee_id: authorized.id,
          role: "member",
        },
      },
    );
  typia.assert(membership2);
  // 6. Create task in first project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        title: "Initial task",
      },
    },
  );
  typia.assert(task1);
  // 7. Create task in second project
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        title: "Updated task",
      },
    },
  );
  typia.assert(task2);
  // 8. Start timer with initial assignment (first project, first task)
  const initialTimer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: project1.id,
        taskId: task1.id,
        description: "Initial work description",
      },
    },
  );
  typia.assert(initialTimer);
  // Store initial values for comparison
  const initialStartedAt = initialTimer.started_at;
  const initialUpdatedAt = initialTimer.updated_at;
  // 9. Update timer with new description, project, and task
  const updatedTimer = await api.functional.hrmPlatform.member.timers.update(
    memberConnection,
    {
      timerId: initialTimer.id,
      body: {
        description: "Updated work description",
        project_id: project2.id,
        task_id: task2.id,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 10. Validate all fields updated correctly
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    "Updated work description",
  );
  TestValidator.equals(
    "project_id updated",
    updatedTimer.project.id,
    project2.id,
  );
  TestValidator.equals("task_id updated", updatedTimer.task?.id, task2.id);
  // 11. Verify timer remains active (stopped_at is null)
  TestValidator.equals("timer remains active", updatedTimer.stopped_at, null);
  // 12. Verify started_at is unchanged
  TestValidator.equals(
    "started_at preserved",
    updatedTimer.started_at,
    initialStartedAt,
  );
  // 13. Verify updated_at is refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedTimer.updated_at,
    initialUpdatedAt,
  );
  // 14. Verify employee ownership preserved
  TestValidator.equals(
    "employee ownership preserved",
    updatedTimer.employee.id,
    initialTimer.employee.id,
  );
}
