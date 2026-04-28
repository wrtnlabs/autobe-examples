import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task status transition audit trail verification.
 *
 * Validates the complete task lifecycle status tracking through the append-only audit trail system.
 * A member joins the platform, creates a project, creates a task within the project, then updates
 * the task status multiple times to generate history records. The test verifies that the task
 * status change history endpoint returns records in chronological order with correct oldStatus,
 * newStatus, member, task, and createdAt fields.
 *
 * 1. Member joins the platform.
 * 2. Member creates a project within their organization context.
 * 3. Member creates a task within the project with initial 'open' status.
 * 4. Task is updated to 'in-progress' to generate first history record.
 * 5. Task is updated to 'completed' to generate second history record.
 * 6. Task history is retrieved and validated for chronological ordering and correct status transition records.
 */
export async function test_api_task_status_transition_audit_trail(
  connection: api.IConnection,
) {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project within organization context
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create task in the project with initial 'open' status
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 4. Update task status from 'open' to 'in-progress'
  const inProgressTask =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "in-progress" } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(inProgressTask);
  // 5. Update task status from 'in-progress' to 'completed'
  const completedTask =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "completed" } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(completedTask);
  // 6. Retrieve task status change history
  const histories = typia.assert<IHrmPlatformTaskHistory[]>(
    await api.functional.hrmPlatform.member.projects.tasks.histories(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
      },
    ),
  );
  // 7. Validate history records exist
  TestValidator.predicate(
    "at least two history records exist",
    histories.length >= 2,
  );
  // 8. Verify chronological ordering (earliest first)
  TestValidator.predicate(
    "history records are chronologically ordered earliest first",
    histories[0].createdAt <= histories[1].createdAt,
  );
  // 9. Verify first transition: open -> in-progress
  // Use typia.assertGuard to narrow the array element type
  typia.assertGuard(histories[0]);
  TestValidator.equals(
    "first transition oldStatus is open",
    histories[0].oldStatus,
    "open",
  );
  TestValidator.equals(
    "first transition newStatus is in-progress",
    histories[0].newStatus,
    "in-progress",
  );
  // 10. Verify second transition: in-progress -> completed
  typia.assertGuard(histories[1]);
  TestValidator.equals(
    "second transition oldStatus is in-progress",
    histories[1].oldStatus,
    "in-progress",
  );
  TestValidator.equals(
    "second transition newStatus is completed",
    histories[1].newStatus,
    "completed",
  );
}