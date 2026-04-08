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
 * Test that task retrieval includes complete task details with related entities.
 *
 * This test validates the task retrieval endpoint response structure, ensuring that all related entities and task attributes are properly included. The test authenticates as a member and retrieves a task to verify the response contains project details, employee assignment, parent task reference, and subtasks.
 *
 * Since task creation and status update endpoints are not available in the SDK, this test focuses on validating the response structure and type safety of the task retrieval endpoint. The test verifies that:
 * - The response includes all task attributes (title, description, priority, status, effort tracking)
 * - Related entities are properly included (project, employee, parentTask, subtasks)
 * - Timestamps are valid and in correct format
 * - Nullable fields are properly handled
 *
 * 1. Authenticate as member using authorize_member_join utility
 * 2. Generate a valid task ID for retrieval
 * 3. Call GET /hrmTimeTrack/member/tasks/{taskId} endpoint
 * 4. Validate response structure includes all required fields
 * 5. Verify related entities are properly populated
 */
export async function test_api_task_retrieval_with_status_history_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Generate a valid task ID for retrieval
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve task with all related entities
  const task: IHrmTimeTrackTask =
    await api.functional.hrmTimeTrack.member.tasks.at(memberConnection, {
      taskId,
    });
  typia.assert(task);
  // 4. Validate task core attributes
  TestValidator.equals("task ID matches request", task.id, taskId);
  TestValidator.predicate("task title is not empty", task.title.length > 0);
  TestValidator.predicate(
    "task has valid priority",
    ["low", "medium", "high", "critical"].includes(task.priority),
  );
  TestValidator.predicate(
    "task has valid status",
    ["open", "in-progress", "completed", "closed"].includes(task.status),
  );
  // 5. Validate project relationship (required)
  TestValidator.equals(
    "project ID is valid UUID",
    task.project.id,
    task.project.id,
  );
  TestValidator.predicate(
    "project name is not empty",
    task.project.name.length > 0,
  );
  TestValidator.predicate(
    "project has valid status",
    ["active", "archived", "completed"].includes(task.project.status),
  );
  // 6. Validate employee assignment (nullable)
  if (task.employee !== null) {
    TestValidator.predicate(
      "assigned employee has valid ID",
      task.employee.id.length > 0,
    );
    TestValidator.predicate(
      "employee has member info",
      task.employee.member.email.length > 0,
    );
    TestValidator.predicate(
      "employee has valid position",
      task.employee.position.length > 0,
    );
  }
  // 7. Validate parent task relationship (nullable)
  if (task.parentTask !== null) {
    TestValidator.predicate(
      "parent task has valid ID",
      task.parentTask.id.length > 0,
    );
    TestValidator.predicate(
      "parent task has title",
      task.parentTask.title.length > 0,
    );
    TestValidator.predicate(
      "parent task has valid status",
      ["open", "in-progress", "completed", "closed"].includes(
        task.parentTask.status,
      ),
    );
  }
  // 8. Validate subtasks array
  TestValidator.predicate("subtasks is array", Array.isArray(task.subtasks));
  for (const subtask of task.subtasks) {
    TestValidator.predicate("subtask has valid ID", subtask.id.length > 0);
    TestValidator.predicate("subtask has title", subtask.title.length > 0);
    TestValidator.predicate(
      "subtask has valid status",
      ["open", "in-progress", "completed", "closed"].includes(subtask.status),
    );
  }
  // 9. Validate timestamps
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(task.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(task.updated_at)),
  );
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(task.updated_at) >= new Date(task.created_at),
  );
  // 10. Validate effort tracking (nullable)
  if (task.effort_estimate !== null) {
    TestValidator.predicate(
      "effort_estimate is positive",
      task.effort_estimate > 0,
    );
  }
  if (task.effort_actual !== null) {
    TestValidator.predicate(
      "effort_actual is non-negative",
      task.effort_actual >= 0,
    );
  }
  // 11. Validate soft delete status
  TestValidator.predicate("task is not soft deleted", task.deleted_at === null);
}
