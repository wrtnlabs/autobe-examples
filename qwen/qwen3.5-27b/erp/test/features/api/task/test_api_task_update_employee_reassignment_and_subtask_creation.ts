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
 * Test updating a task with employee reassignment and parent task assignment.
 *
 * Validates the complete task update flow including employee reassignment to a different project member and establishing a parent-child task relationship. Ensures that task updates correctly handle employee reassignment constraints (target must be project member), parent task assignment rules (one-level nesting only), and effort estimate modifications.
 *
 * The test verifies that the updated task response accurately reflects the new employee assignment, parent task relationship, and effort estimate changes while maintaining all other task attributes.
 *
 * 1. Authenticate as member with project management permissions.
 * 2. Create organization and two employees for task assignment testing.
 * 3. Create project and assign both employees as project members.
 * 4. Create parent task (without subtasks) and child task (initially unassigned).
 * 5. Update child task with new employee assignment, parent task reference, and effort estimates.
 * 6. Validate updated task reflects all changes correctly.
 */
export async function test_api_task_update_employee_reassignment_and_subtask_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create two employees using the authenticated member ID
  const employee1 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_member_id: authorized.id,
        },
      },
    );
  const employee2 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_member_id: authorized.id,
        },
      },
    );
  // 4. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  // 5. Assign both employees as project members
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: employee1.id,
        role: "project-lead",
      },
    },
  );
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: employee2.id,
        role: "member",
      },
    },
  );
  // 6. Create parent task (no subtasks initially)
  const parentTask = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: "Parent Task - Development Phase",
        priority: "high",
        status: "in-progress",
        effort_estimate: 40,
      },
    },
  );
  // 7. Create child task (initially assigned to employee1, no parent)
  const childTask = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        hrm_time_track_employee_id: employee1.id,
        title: "Child Task - Initial Assignment",
        priority: "medium",
        status: "open",
        effort_estimate: 8,
      },
    },
  );
  // 8. Update child task: reassign to employee2, add parent task, update effort
  const updatedTask = await api.functional.hrmTimeTrack.member.tasks.update(
    memberConnection,
    {
      taskId: childTask.id,
      body: {
        title: "Child Task - Reassigned with Parent",
        status: "in-progress",
        priority: "high",
        effort_estimate: 12,
        effort_actual: 3,
        hrm_time_track_employee_id: employee2.id,
        parent_task_id: parentTask.id,
      } satisfies IHrmTimeTrackTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 9. Validate updated task
  TestValidator.equals(
    "employee reassigned to employee2",
    updatedTask.employee?.id,
    employee2.id,
  );
  TestValidator.equals(
    "parent task assigned correctly",
    updatedTask.parentTask?.id,
    parentTask.id,
  );
  TestValidator.equals(
    "effort estimate updated",
    updatedTask.effort_estimate,
    12,
  );
  TestValidator.equals("effort actual set", updatedTask.effort_actual, 3);
  TestValidator.equals(
    "status changed to in-progress",
    updatedTask.status,
    "in-progress",
  );
  TestValidator.equals(
    "priority changed to high",
    updatedTask.priority,
    "high",
  );
  TestValidator.equals(
    "title updated",
    updatedTask.title,
    "Child Task - Reassigned with Parent",
  );
  TestValidator.predicate(
    "parent task has child in subtasks",
    ArrayUtil.has(updatedTask.subtasks, (sub) => sub.id === childTask.id),
  );
}
