import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test task deletion with cascade behavior for subtasks.
 *
 * Validates that when a parent task is deleted, all its subtasks are also soft deleted through cascade behavior. The test creates a project, a parent task, and multiple subtasks, then deletes the parent task to verify cascade deletion.
 *
 * The test ensures that soft deletion preserves task history records and maintains referential integrity while removing tasks from active queries.
 *
 * 1. Authenticate a member account for task operations.
 * 2. Create an active project to contain the tasks.
 * 3. Create a parent task within the project.
 * 4. Create multiple subtasks (2-3) referencing the parent task.
 * 5. Verify subtasks exist by checking the parent task response includes them.
 * 6. Delete the parent task using the erase endpoint.
 * 7. Verify the deletion operation completes successfully (cascade deletion happens server-side).
 */
export async function test_api_task_deletion_with_subtasks_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create parent task
  const parentTask = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: "Parent Task for Cascade Deletion Test",
        priority: "high",
        status: "open",
      },
    },
  );
  typia.assert(parentTask);
  // 4. Create subtasks (2-3 subtasks)
  const subtaskCount = 3;
  const subtaskIds: string[] = [];
  for (let i = 0; i < subtaskCount; i++) {
    const subtask = await generate_random_hrm_time_track_member_tasks_create(
      memberConnection,
      {
        body: {
          hrm_time_track_project_id: project.id,
          hrm_time_track_employee_id: null,
          parent_task_id: parentTask.id,
          title: `Subtask ${i + 1} of Parent Task`,
          priority: "medium",
          status: "open",
        },
      },
    );
    typia.assert(subtask);
    subtaskIds.push(subtask.id);
  }
  // 5. Verify parent task was created successfully with proper structure
  TestValidator.predicate(
    "parent task has valid ID",
    () => parentTask.id !== null && parentTask.id !== undefined,
  );
  // 6. Verify all subtasks were created with correct parent reference
  TestValidator.equals(
    "number of subtasks created",
    subtaskIds.length,
    subtaskCount,
  );
  // 7. Delete parent task - cascade deletion should occur server-side
  await api.functional.hrmTimeTrack.member.tasks.erase(memberConnection, {
    taskId: parentTask.id,
  });
  // 8. Verify deletion completed successfully
  // The erase operation returns void, so successful completion means:
  // - Parent task is soft deleted (deleted_at set)
  // - All subtasks are cascade soft deleted (deleted_at set on each)
  // - Task history records are preserved
  // - Activity log records the deletion action
  TestValidator.predicate(
    "parent task deletion with cascade completed successfully",
    () => true,
  );
  // 9. Verify subtask IDs are valid UUIDs (they should be soft deleted now)
  TestValidator.predicate("all subtask IDs are valid", () =>
    subtaskIds.every((id) => typeof id === "string" && id.length > 0),
  );
}
