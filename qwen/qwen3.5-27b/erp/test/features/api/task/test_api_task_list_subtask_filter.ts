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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_projects_members_create } from "../../../generate/generate_random_hrm_time_track_member_projects_members_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test that an authenticated member can filter tasks by parent task to retrieve subtasks.
 *
 * Validates the task filtering functionality by parent_task_id, ensuring that subtasks can be correctly retrieved and that the parentTask relationship is properly populated. Tests both filtered and unfiltered task lists to verify the hierarchical structure is maintained correctly.
 *
 * Special attention is given to verifying that the parent_task_id filter returns only direct child tasks (one level of nesting), and that the parentTask field is correctly populated for subtasks while remaining null for parent tasks.
 *
 * 1. Member registers and authenticates to access the task listing endpoint.
 * 2. Organization is created as the context for project and task creation.
 * 3. Employee record is created linking the member to the organization.
 * 4. Project is created within the organization.
 * 5. Employee is assigned as a project member to gain task access.
 * 6. Parent task is created within the project without a parent_task_id.
 * 7. Multiple subtasks are created with the parent task ID.
 * 8. Additional unrelated tasks are created without parent task.
 * 9. Filtered query with parent_task_id returns only the subtasks.
 * 10. Unfiltered query returns all tasks including parent and subtasks.
 * 11. Validates parentTask relationships are correctly populated.
 */
export async function test_api_task_list_subtask_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign employee as project member
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: employee.id,
        role: "project-lead",
      } satisfies IHrmTimeTrackProjectMember.ICreate,
    },
  );
  // 6. Create parent task
  const parentTask = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "high",
        status: "open",
      } satisfies IHrmTimeTrackTask.ICreate,
    },
  );
  typia.assert(parentTask);
  // 7. Create multiple subtasks
  const subtasks: IHrmTimeTrackTask[] = [];
  for (let i = 0; i < 3; i++) {
    const subtask = await generate_random_hrm_time_track_member_tasks_create(
      memberConnection,
      {
        body: {
          hrm_time_track_project_id: project.id,
          title: `Subtask ${i + 1}: ${RandomGenerator.paragraph({
            sentences: 2,
          })}`,
          parent_task_id: parentTask.id,
          priority: "medium",
          status: "open",
        } satisfies IHrmTimeTrackTask.ICreate,
      },
    );
    typia.assert(subtask);
    subtasks.push(subtask);
  }
  // 8. Create unrelated tasks
  const unrelatedTasks: IHrmTimeTrackTask[] = [];
  for (let i = 0; i < 2; i++) {
    const unrelatedTask =
      await generate_random_hrm_time_track_member_tasks_create(
        memberConnection,
        {
          body: {
            hrm_time_track_project_id: project.id,
            title: `Unrelated task ${i + 1}: ${RandomGenerator.paragraph({
              sentences: 2,
            })}`,
            priority: "low",
            status: "open",
          } satisfies IHrmTimeTrackTask.ICreate,
        },
      );
    typia.assert(unrelatedTask);
    unrelatedTasks.push(unrelatedTask);
  }
  // 9. Filter by parent_task_id - should return only subtasks
  const filteredResult = await api.functional.hrmTimeTrack.member.tasks.index(
    memberConnection,
    {
      body: {
        parent_task_id: parentTask.id,
        limit: 100,
      } satisfies IHrmTimeTrackTask.IRequest,
    },
  );
  typia.assert(filteredResult);
  // Validate filtered results contain only subtasks
  TestValidator.equals(
    "filtered task count matches subtasks",
    filteredResult.data.length,
    subtasks.length,
  );
  const filteredIds = filteredResult.data.map((t) => t.id);
  for (const subtask of subtasks) {
    TestValidator.predicate(
      `subtask ${subtask.id} is in filtered results`,
      filteredIds.includes(subtask.id),
    );
  }
  // Validate each subtask has parentTask populated
  for (const task of filteredResult.data) {
    TestValidator.predicate(
      `task ${task.id} has parentTask populated`,
      task.parentTask !== null,
    );
    if (task.parentTask !== null) {
      TestValidator.equals(
        `task ${task.id} parent matches parentTask`,
        task.parentTask.id,
        parentTask.id,
      );
    }
  }
  // 10. Query without filter - should return all tasks
  const unfilteredResult = await api.functional.hrmTimeTrack.member.tasks.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmTimeTrackTask.IRequest,
    },
  );
  typia.assert(unfilteredResult);
  // Validate unfiltered results contain parent, subtasks, and unrelated tasks
  const expectedTotal = 1 + subtasks.length + unrelatedTasks.length;
  TestValidator.equals(
    "unfiltered task count matches total",
    unfilteredResult.data.length,
    expectedTotal,
  );
  const unfilteredIds = unfilteredResult.data.map((t) => t.id);
  TestValidator.predicate(
    "parent task is in unfiltered results",
    unfilteredIds.includes(parentTask.id),
  );
  for (const subtask of subtasks) {
    TestValidator.predicate(
      `subtask ${subtask.id} is in unfiltered results`,
      unfilteredIds.includes(subtask.id),
    );
  }
  for (const unrelatedTask of unrelatedTasks) {
    TestValidator.predicate(
      `unrelated task ${unrelatedTask.id} is in unfiltered results`,
      unfilteredIds.includes(unrelatedTask.id),
    );
  }
  // 11. Validate parent task has null parentTask
  const parentTaskInResults = unfilteredResult.data.find(
    (t) => t.id === parentTask.id,
  );
  if (parentTaskInResults) {
    TestValidator.equals(
      "parent task has null parentTask",
      parentTaskInResults.parentTask,
      null,
    );
  }
  // Validate subtasks have populated parentTask in unfiltered results
  for (const subtask of subtasks) {
    const subtaskInResults = unfilteredResult.data.find(
      (t) => t.id === subtask.id,
    );
    if (subtaskInResults) {
      TestValidator.predicate(
        `subtask ${subtask.id} has parentTask populated in unfiltered`,
        subtaskInResults.parentTask !== null,
      );
      if (subtaskInResults.parentTask !== null) {
        TestValidator.equals(
          `subtask ${subtask.id} parent matches parentTask`,
          subtaskInResults.parentTask.id,
          parentTask.id,
        );
      }
    }
  }
  // Validate unrelated tasks have null parentTask
  for (const unrelatedTask of unrelatedTasks) {
    const taskInResults = unfilteredResult.data.find(
      (t) => t.id === unrelatedTask.id,
    );
    if (taskInResults) {
      TestValidator.equals(
        `unrelated task ${unrelatedTask.id} has null parentTask`,
        taskInResults.parentTask,
        null,
      );
    }
  }
}
