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
 * Test task listing with project filter for authenticated member.
 *
 * Validates that an authenticated member can retrieve a paginated list of tasks filtered by a specific project. The test creates the necessary organizational structure including member authentication, organization, employee record, project, and project membership before creating multiple tasks with varying statuses and priorities.
 *
 * The test verifies that the filtered task list contains only tasks from the specified project, includes proper pagination metadata, and correctly represents task relationships including project, employee assignee, and parent task references.
 *
 * 1. Register and authenticate a member account
 * 2. Create an organization for the member
 * 3. Create an employee record linking the member to the organization
 * 4. Create a project within the organization
 * 5. Assign the employee as a project member
 * 6. Create multiple tasks within the project with different statuses and priorities
 * 7. Retrieve tasks filtered by project_id
 * 8. Validate response contains only tasks from the filtered project
 * 9. Verify pagination metadata is correct
 * 10. Verify task relationships (project, employee, parentTask) are properly populated
 */
export async function test_api_task_list_with_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection);
  typia.assert(authResult);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee record for the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authResult.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create a project within the organization
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign employee as project member
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        employee_id: employee.id,
        role: "project-lead",
      },
    },
  );
  // 6. Create multiple tasks within the project
  const task1 = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: "Task 1 - High Priority",
        priority: "high",
        status: "open",
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: "Task 2 - Medium Priority",
        priority: "medium",
        status: "in-progress",
        hrm_time_track_employee_id: employee.id,
      },
    },
  );
  typia.assert(task2);
  const task3 = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: "Task 3 - Low Priority",
        priority: "low",
        status: "completed",
      },
    },
  );
  typia.assert(task3);
  // 7. Retrieve tasks filtered by project_id
  const result = await api.functional.hrmTimeTrack.member.tasks.index(
    memberConnection,
    {
      body: {
        project_id: project.id,
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackTask.IRequest,
    },
  );
  typia.assert(result);
  // 8. Validate response contains only tasks from the filtered project
  TestValidator.equals(
    "task count matches created tasks",
    result.data.length,
    3,
  );
  // Verify all tasks belong to the filtered project
  for (const task of result.data) {
    TestValidator.equals(
      `task ${task.id} belongs to filtered project`,
      task.project.id,
      project.id,
    );
  }
  // 9. Verify pagination metadata is correct
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.equals("pagination records", result.pagination.records, 3);
  TestValidator.equals("pagination pages", result.pagination.pages, 1);
  // 10. Verify task relationships
  for (const task of result.data) {
    // Project relationship should be populated
    TestValidator.predicate(
      `task ${task.id} has project relationship`,
      task.project !== null && task.project.id !== undefined,
    );
    // ParentTask should be null for top-level tasks
    TestValidator.equals(
      `task ${task.id} parentTask is null for top-level`,
      task.parentTask,
      null,
    );
    // Verify required fields exist
    TestValidator.predicate(`task ${task.id} has id`, task.id !== undefined);
    TestValidator.predicate(
      `task ${task.id} has title`,
      task.title !== undefined,
    );
    TestValidator.predicate(
      `task ${task.id} has priority`,
      task.priority !== undefined,
    );
    TestValidator.predicate(
      `task ${task.id} has status`,
      task.status !== undefined,
    );
    TestValidator.predicate(
      `task ${task.id} has created_at`,
      task.created_at !== undefined,
    );
    TestValidator.predicate(
      `task ${task.id} has updated_at`,
      task.updated_at !== undefined,
    );
  }
  // Verify employee assignment: task2 should have employee, others should be null
  const taskWithEmployee = result.data.find(
    (t) => t.title === "Task 2 - Medium Priority",
  );
  const taskWithoutEmployee = result.data.find(
    (t) => t.title === "Task 1 - High Priority",
  );
  if (taskWithEmployee) {
    TestValidator.predicate(
      "assigned task has employee relationship",
      taskWithEmployee.employee !== null,
    );
    if (taskWithEmployee.employee) {
      TestValidator.equals(
        "assigned task employee matches created employee",
        taskWithEmployee.employee.id,
        employee.id,
      );
    }
  }
  if (taskWithoutEmployee) {
    TestValidator.equals(
      "unassigned task has null employee",
      taskWithoutEmployee.employee,
      null,
    );
  }
}
