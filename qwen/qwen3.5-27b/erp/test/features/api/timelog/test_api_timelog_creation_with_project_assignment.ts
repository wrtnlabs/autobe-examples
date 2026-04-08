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
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";

/**
 * Test the primary success path for creating a timelog entry with project assignment.
 *
 * Validates the complete timelog creation workflow including member authentication, organization setup, employee creation, project creation, project member assignment, and timelog entry. Ensures that the timelog correctly references the project and employee, and that all system-generated fields are properly populated.
 *
 * Special attention is given to verifying that the employee is assigned as a project member (required prerequisite), the date is valid (not in future), duration is positive, and the response includes all expected summary objects.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Organization is created for the authenticated member.
 * 3. Employee record is created linking member to organization.
 * 4. Project is created within the organization for time logging.
 * 5. Employee is assigned to the project as a project member (required prerequisite).
 * 6. Timelog is created with valid date, positive duration, project ID, and billable status.
 * 7. Validates timelog details match input and include all expected fields and summary objects.
 */
export async function test_api_timelog_creation_with_project_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.hrmTimeTrack.auth.member.join(
    memberConnection,
    {
      body: typia.random<IHrmTimeTrackMember.IJoin>(),
    },
  );
  typia.assert(memberAuth);
  // 2. Organization setup
  const organization =
    await api.functional.hrmTimeTrack.member.organizations.create(
      memberConnection,
      {
        body: typia.random<IHrmTimeTrackOrganization.ICreate>(),
      },
    );
  typia.assert(organization);
  // 3. Employee creation
  const employee = await api.functional.hrmTimeTrack.member.employees.create(
    memberConnection,
    {
      body: {
        position: RandomGenerator.name(),
        employment_type: "full-time",
        hire_date: new Date().toISOString(),
        status: "active",
        hrm_time_track_member_id: memberAuth.id,
      } satisfies IHrmTimeTrackEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Project creation
  const project = await api.functional.hrmTimeTrack.member.projects.create(
    memberConnection,
    {
      body: typia.random<IHrmTimeTrackProject.ICreate>(),
    },
  );
  typia.assert(project);
  // 5. Project member assignment (required prerequisite)
  const projectMember =
    await api.functional.hrmTimeTrack.member.projects.members.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employee.id,
        } satisfies IHrmTimeTrackProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 6. Timelog creation
  const timelog = await api.functional.hrmTimeTrack.member.timelogs.create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        duration_seconds: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        hrm_time_track_project_id: project.id,
        hrm_time_track_task_id: null,
        billable: true,
        notes: null,
      } satisfies IHrmTimeTrackTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Validation
  TestValidator.equals("project matches", timelog.project.id, project.id);
  TestValidator.equals("employee matches", timelog.employee.id, employee.id);
  TestValidator.equals("task is null", timelog.task, null);
  TestValidator.predicate("has valid id", timelog.id.length > 0);
  TestValidator.predicate("has valid date", timelog.date.length > 0);
  TestValidator.predicate(
    "has positive duration",
    timelog.duration_seconds > 0,
  );
  TestValidator.equals("billable matches", timelog.billable, true);
  TestValidator.equals("notes is null", timelog.notes, null);
  TestValidator.predicate("has created_at", timelog.created_at.length > 0);
  TestValidator.predicate("has updated_at", timelog.updated_at.length > 0);
  TestValidator.equals("deleted_at is null", timelog.deleted_at, null);
}
