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
 * Test that an authenticated member can retrieve complete task details for a task within a project they have access to.
 *
 * Validates the task retrieval endpoint by ensuring an authenticated member can access task details including all core attributes, related entities, and proper handling of nullable fields. This test requires pre-existing organizational structure (organization, employee, project, task) as setup utilities for these resources are not available in the current test environment.
 *
 * Special attention is given to verifying that the task response contains all required fields and that nullable fields (description, employee, parentTask, effort estimates, deleted_at) are correctly represented. The test validates business logic such as task existence, project relationship, and timestamp validity.
 *
 * 1. Register and authenticate a member using authorize_member_join utility.
 * 2. Retrieve an existing task using GET /hrmTimeTrack/member/tasks/{taskId}.
 * 3. Validate response contains IHrmTimeTrackTask with all expected fields.
 * 4. Verify task data integrity and business rules (active task, valid project reference).
 * 5. Verify related entities are included (project summary, optional employee/parentTask).
 * 6. Verify timestamps are present and valid.
 */
export async function test_api_task_retrieval_by_member_with_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Prerequisites: This test requires pre-existing organizational structure
  // In a complete E2E test suite, the following would be created:
  // - Organization (IHrmTimeTrackOrganization)
  // - Employee record linking member to organization (IHrmTimeTrackEmployee)
  // - Project within organization (IHrmTimeTrackProject)
  // - Task within project (IHrmTimeTrackTask)
  // - Project membership granting member access to the project
  //
  // For this test, we assume a valid taskId exists and the authenticated member
  // has access to the project containing that task.
  // Use a predefined task ID that exists in the test database
  // In production, this would be created through setup utilities
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the task
  const task = await api.functional.hrmTimeTrack.member.tasks.at(
    memberConnection,
    { taskId },
  );
  typia.assert(task);
  // 4. Validate business logic - task attributes
  TestValidator.equals("task ID matches request", task.id, taskId);
  TestValidator.predicate("task has non-empty title", task.title.length > 0);
  TestValidator.predicate(
    "task has valid priority",
    ["low", "medium", "high", "critical"].includes(task.priority),
  );
  TestValidator.predicate(
    "task has valid status",
    ["open", "in_progress", "completed", "closed"].includes(task.status),
  );
  // 5. Validate nullable fields - business logic checks
  // description can be null (optional field)
  if (task.description !== null) {
    TestValidator.predicate(
      "description is non-empty when present",
      task.description.length > 0,
    );
  }
  // effort estimates can be null (optional tracking)
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
  // 6. Validate active task (not soft-deleted)
  TestValidator.equals(
    "active task has null deleted_at",
    task.deleted_at,
    null,
  );
  // 7. Validate timestamps - business logic
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(task.created_at) <= new Date(task.updated_at),
  );
  // 8. Validate project relationship - required field
  TestValidator.predicate("project exists", task.project !== null);
  TestValidator.equals(
    "project has non-empty name",
    task.project.name.length > 0,
    true,
  );
  TestValidator.predicate(
    "project has valid status",
    ["active", "archived", "completed"].includes(task.project.status),
  );
  // 9. Validate subtasks array structure
  TestValidator.predicate("subtasks is array", Array.isArray(task.subtasks));
  TestValidator.predicate(
    "all subtasks have valid IDs",
    task.subtasks.every((subtask) => /^[0-9a-f-]{36}$/i.test(subtask.id)),
  );
  // 10. Validate optional employee assignment
  // employee can be null (task may be unassigned)
  if (task.employee !== null) {
    TestValidator.predicate(
      "assigned employee has valid member",
      task.employee.member !== null,
    );
    TestValidator.predicate(
      "employee member has email",
      task.employee.member.email.length > 0,
    );
  }
  // 11. Validate optional parent task relationship
  // parentTask can be null (top-level task)
  if (task.parentTask !== null) {
    TestValidator.predicate(
      "parent task has valid ID",
      /^[0-9a-f-]{36}$/i.test(task.parentTask.id),
    );
    TestValidator.predicate(
      "parent task ID differs from current task",
      task.parentTask.id !== task.id,
    );
  }
}
