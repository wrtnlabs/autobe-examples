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
 * Test that an authenticated employee can successfully retrieve their own timelog record.
 *
 * Validates the complete timelog retrieval workflow including member authentication, organization setup, employee creation, project assignment, and timelog creation. Ensures that the timelog correctly references the employee and project, and that all required fields are present with valid values.
 *
 * Special attention is given to verifying that the timelog belongs to the authenticated employee, the project reference is correct, and the timelog is not soft-deleted.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Organization is created for the member using generate_random utility.
 * 3. Employee record is created linking the member to the organization.
 * 4. Project is created within the organization.
 * 5. Employee is assigned as a project member.
 * 6. Timelog is created for the employee on the project.
 * 7. Timelog is retrieved by ID and validated.
 */
export async function test_api_timelog_view_own_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee record
  const employee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {},
    );
  typia.assert(employee);
  // 4. Create project
  const project =
    await generate_random_hrm_time_track_member_projects_create(
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
      },
    },
  );
  // 6. Create timelog
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
      },
    },
  );
  typia.assert(timelog);
  // 7. Retrieve timelog by ID
  const retrievedTimelog = await api.functional.hrmTimeTrack.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 8. Validate business logic
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "employee matches",
    retrievedTimelog.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "duration is positive",
    retrievedTimelog.duration_seconds > 0,
  );
  TestValidator.predicate(
    "timelog is not deleted",
    retrievedTimelog.deleted_at === null,
  );
}