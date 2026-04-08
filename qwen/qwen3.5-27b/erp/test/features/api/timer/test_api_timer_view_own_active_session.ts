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
import type { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
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
import { generate_random_hrm_time_track_member_timers_create } from "../../../generate/generate_random_hrm_time_track_member_timers_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_timer } from "../../../prepare/prepare_random_hrm_time_track_timer";

/**
 * Test that an authenticated employee can successfully retrieve their own active timer session details.
 *
 * Validates the complete timer viewing flow including member registration, organization and employee setup, project creation, timer activation, and retrieval of the active timer session. Ensures that the timer correctly references the employee and project, and that computed fields like active status are accurate.
 *
 * Special attention is given to verifying that the timer belongs to the requesting employee, all nested relationships (employee, project) are properly populated, and the timer shows as active with a valid start timestamp.
 *
 * 1. Register and authenticate as a member.
 * 2. Create an organization for the employee context.
 * 3. Create an employee record linking the member to the organization.
 * 4. Create a project within the organization.
 * 5. Start a timer for the employee with the project.
 * 6. Retrieve the active timer session by timerId.
 * 7. Validate timer details match input and show as active.
 */
export async function test_api_timer_view_own_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: { name: "Test Organization" } },
    );
  typia.assert(organization);
  // 3. Create an employee record linking the member to the organization
  const employee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(employee);
  // 4. Create a project within the organization
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      { body: { name: "Test Project" } },
    );
  typia.assert(project);
  // 5. Start a timer for the employee with the project
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timer);
  // 6. Retrieve the active timer session by timerId
  const retrievedTimer = await api.functional.hrmTimeTrack.member.timers.at(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(retrievedTimer);
  // 7. Validate timer details
  TestValidator.equals("timer id matches", retrievedTimer.id, timer.id);
  TestValidator.equals(
    "project id matches",
    retrievedTimer.project.id,
    project.id,
  );
  TestValidator.equals("timer is active", retrievedTimer.is_active, true);
  TestValidator.predicate(
    "started_at exists",
    retrievedTimer.started_at.length > 0,
  );
  TestValidator.equals(
    "employee id matches",
    retrievedTimer.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTimer.project.name,
    project.name,
  );
  TestValidator.equals("task is null", retrievedTimer.task, null);
}