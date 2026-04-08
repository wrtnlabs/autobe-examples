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
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
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
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";

/**
 * Test timelog creation with task assignment for granular time tracking.
 *
 * Validates the complete timelog creation flow including member authentication, organization setup, employee creation, project assignment, task creation, and timelog logging against a specific task. Ensures that the timelog correctly references the task and that all timelog fields are properly recorded.
 *
 * Special attention is given to verifying that the task_id reference is correctly maintained in the timelog response, the task summary object is populated with all expected fields (id, title, priority, status, project reference), and that billable status and duration are accurately stored.
 *
 * 1. Member authenticates via join endpoint to establish session context.
 * 2. Organization is created for the authenticated member.
 * 3. Employee record is created linking member to organization.
 * 4. Project is created within the organization.
 * 5. Employee is assigned to the project with appropriate role.
 * 6. Task is created within the project for granular time tracking.
 * 7. Timelog is created with task assignment, duration, billable status, and notes.
 * 8. Validates timelog details match input and task data is properly referenced.
 */
export async function test_api_timelog_creation_with_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection);
  typia.assert(memberAuth);
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
    {
      body: {
        hrm_time_track_member_id: memberAuth.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign employee to project
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: employee.id,
        role: "member",
      },
    },
  );
  // 6. Create task within the project
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        hrm_time_track_employee_id: employee.id,
      },
    },
  );
  typia.assert(task);
  // 7. Create timelog with task assignment
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_time_track_task_id: task.id,
        billable: true,
        notes: "Working on task implementation",
      },
    },
  );
  typia.assert(timelog);
  // 8. Validate timelog contains task summary
  typia.assertGuard(timelog.task!);
  // 9. Validate task summary fields
  TestValidator.equals("task id matches", timelog.task.id, task.id);
  TestValidator.predicate(
    "task title has content",
    timelog.task.title.length > 0,
  );
  TestValidator.predicate(
    "task has priority",
    timelog.task.priority.length > 0,
  );
  TestValidator.predicate("task has status", timelog.task.status.length > 0);
  TestValidator.equals(
    "task project id matches",
    timelog.task.project.id,
    project.id,
  );
  // 10. Validate billable status
  TestValidator.equals("billable status matches input", timelog.billable, true);
  // 11. Validate duration is positive
  TestValidator.predicate(
    "duration_seconds is positive",
    timelog.duration_seconds > 0,
  );
  // 12. Validate notes are recorded
  TestValidator.equals(
    "notes match input",
    timelog.notes,
    "Working on task implementation",
  );
  // 13. Validate employee reference
  TestValidator.equals("employee id matches", timelog.employee.id, employee.id);
  // 14. Validate project reference
  TestValidator.equals("project id matches", timelog.project.id, project.id);
}
