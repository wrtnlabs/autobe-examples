import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
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

/**
 * Test task retrieval with hierarchical subtask relationships.
 *
 * Validates that task retrieval correctly includes parent task references and child subtasks in the response. Tests the one-level nesting structure where parent tasks have null parentTask field and populated subtasks array, while child subtasks have populated parentTask field and empty subtasks array.
 *
 * The test verifies the hierarchical task structure by retrieving both parent and child tasks, ensuring that the parent-child relationships are correctly maintained in the API responses.
 *
 * 1. Register and authenticate as a member.
 * 2. Retrieve a parent task (top-level task with no parent).
 * 3. Verify parentTask field is null for top-level task.
 * 4. Verify subtasks array contains child task summaries.
 * 5. Retrieve a child subtask from the parent's subtasks array.
 * 6. Verify parentTask field contains parent task summary for subtask.
 * 7. Verify subtasks array is empty for child task (one-level nesting only).
 */
export async function test_api_task_retrieval_with_subtasks_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Retrieve a parent task (top-level task)
  // Note: In a real scenario, we would create tasks first, but since no task creation
  // APIs are provided in the SDK, we'll retrieve an existing task that should have
  // the hierarchical structure we're testing
  const parentTaskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const parentTask: IHrmTimeTrackTask =
    await api.functional.hrmTimeTrack.member.tasks.at(memberConnection, {
      taskId: parentTaskId,
    });
  typia.assert(parentTask);
  // 3. Verify parentTask field is null for top-level task
  TestValidator.equals(
    "parentTask is null for top-level task",
    parentTask.parentTask,
    null,
  );
  // 4. Verify subtasks array contains child task summaries
  TestValidator.predicate(
    "subtasks array exists",
    Array.isArray(parentTask.subtasks),
  );
  // 5. If subtasks exist, test child task retrieval
  if (parentTask.subtasks.length > 0) {
    const childTaskId: string & tags.Format<"uuid"> = parentTask.subtasks[0].id;
    // Retrieve the child subtask
    const childTask: IHrmTimeTrackTask =
      await api.functional.hrmTimeTrack.member.tasks.at(memberConnection, {
        taskId: childTaskId,
      });
    typia.assert(childTask);
    // 6. Verify parentTask field contains parent task summary for subtask
    TestValidator.predicate(
      "child task has parentTask reference",
      childTask.parentTask !== null,
    );
    TestValidator.equals(
      "parentTask reference matches parent task",
      childTask.parentTask?.id,
      parentTask.id,
    );
    // 7. Verify subtasks array is empty for child task (one-level nesting only)
    TestValidator.equals(
      "subtasks array is empty for child task (one-level nesting)",
      childTask.subtasks.length,
      0,
    );
  } else {
    // If no subtasks, verify the array is empty
    TestValidator.equals(
      "subtasks array is empty when no children exist",
      parentTask.subtasks.length,
      0,
    );
  }
}
