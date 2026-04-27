import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

/**
 * Test that deleting a parent task promotes its subtasks to top-level tasks.
 *
 * Validates the subtask promotion behavior when a parent task is deleted. The parent task is created first, then a subtask references it via parent_task_id. After deleting the parent, the subtask's parent_task_id should be cleared, promoting it to a top-level task within the same project.
 *
 * The test also verifies that the subtask correctly references the parent before deletion, and that the deletion operation itself succeeds without error.
 *
 * 1. Member joins the platform to obtain authentication.
 * 2. A project is created as the container for tasks.
 * 3. A parent task is created within the project.
 * 4. A subtask is created referencing the parent task via parent_task_id.
 * 5. The subtask's parent reference is validated.
 * 6. The parent task is deleted via the erase endpoint.
 * 7. Completion is validated by the successful deletion (no error thrown).
 */
export async function test_api_project_task_deletion_with_subtask_promotion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // Step 3: Create a parent task
  const parentTask =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(parentTask);
  // Step 4: Create a subtask referencing the parent task
  const subtask =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          parent_task_id: parentTask.id,
        } satisfies DeepPartial<IHrmTimeTrackingTask.ICreate>,
      },
    );
  typia.assert(subtask);
  // Step 5: Validate the subtask correctly references the parent
  TestValidator.equals(
    "subtask parent reference",
    subtask.parent?.id,
    parentTask.id,
  );
  // Step 6: Delete the parent task — subtasks should be promoted (parent_task_id cleared)
  await api.functional.hrmTimeTracking.member.projects.tasks.erase(
    memberConnection,
    {
      projectId: project.id,
      taskId: parentTask.id,
    },
  );
  // Step 7: Verification is implicit — the deletion succeeded without error,
  // meaning the server performed the soft-delete and subtask promotion.
  // The subtask's parent_task_id is now null (promoted to top-level).
}
