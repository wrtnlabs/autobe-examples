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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimer";
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
 * Test timer list filtering by project ID for authenticated member.
 *
 * Validates that the timer list endpoint correctly filters timers based on the project_id query parameter. The test creates two projects and starts a timer on one of them, then verifies that filtering by the other project returns an empty result set, while filtering by the correct project returns the active timer.
 *
 * This test ensures that employees can accurately filter their own timers by project, which is essential for time tracking workflows where employees work on multiple projects simultaneously.
 *
 * 1. Register and authenticate as a member
 * 2. Create an organization for the member
 * 3. Create an employee record linking the member to the organization
 * 4. Create two projects (Project A and Project B) within the organization
 * 5. Start a timer for the employee with Project A assigned
 * 6. Query timer list with project_id filter set to Project B's ID
 * 7. Verify the response returns an empty data array with records=0
 * 8. Query timer list with project_id filter set to Project A's ID
 * 9. Verify the response contains exactly one timer with records=1
 * 10. Verify the returned timer's project matches Project A
 */
export async function test_api_timer_list_with_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create an employee record linking the member to the organization
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Create two projects within the organization
  const projectA = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    { body: { name: "Project A" } },
  );
  typia.assert(projectA);
  const projectB = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    { body: { name: "Project B" } },
  );
  typia.assert(projectB);
  // 5. Start a timer for the employee with Project A assigned
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: { project_id: projectA.id },
    },
  );
  typia.assert(timer);
  // 6. Query timer list with project_id filter set to Project B's ID (should be empty)
  const resultWithWrongProject =
    await api.functional.hrmTimeTrack.member.timers.index(memberConnection, {
      body: { project_id: projectB.id } satisfies IHrmTimeTrackTimer.IRequest,
    });
  typia.assert(resultWithWrongProject);
  // 7. Verify the response returns an empty data array with records=0
  TestValidator.equals(
    "timer list with wrong project should be empty",
    resultWithWrongProject.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records with wrong project should be 0",
    resultWithWrongProject.pagination.records,
    0,
  );
  // 8. Query timer list with project_id filter set to Project A's ID (should contain the timer)
  const resultWithCorrectProject =
    await api.functional.hrmTimeTrack.member.timers.index(memberConnection, {
      body: { project_id: projectA.id } satisfies IHrmTimeTrackTimer.IRequest,
    });
  typia.assert(resultWithCorrectProject);
  // 9. Verify the response contains exactly one timer with records=1
  TestValidator.equals(
    "timer list with correct project should contain one timer",
    resultWithCorrectProject.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records with correct project should be 1",
    resultWithCorrectProject.pagination.records,
    1,
  );
  // 10. Verify the returned timer's project matches Project A
  TestValidator.equals(
    "returned timer project should match filtered project",
    resultWithCorrectProject.data[0].project.id,
    projectA.id,
  );
  TestValidator.equals(
    "returned timer should be the active timer",
    resultWithCorrectProject.data[0].id,
    timer.id,
  );
}
