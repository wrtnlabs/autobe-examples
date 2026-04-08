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
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";

/**
 * Test timer list endpoint when employee has no active timer.
 *
 * Validates that the timer list API correctly returns empty results when an employee has no active timers running. The test sets up a complete member, organization, employee, and project context, then queries for active timers with the appropriate filters.
 *
 * This test ensures the system gracefully handles the edge case where no active timers exist, returning proper pagination metadata with zero records instead of throwing errors or returning unexpected data.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create an organization for the member context.
 * 3. Create an employee record linking the member to the organization.
 * 4. Create a project within the organization for timer association.
 * 5. Query timer list with is_active=true and employee_id filters.
 * 6. Validate empty data array and zero pagination counts.
 */
export async function test_api_timer_list_no_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection);
  typia.assert(authResponse);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create an employee record linked to the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authResponse.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create a project within the organization
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  // 5. Query timer list with is_active=true filter for this employee
  const timerList = await api.functional.hrmTimeTrack.member.timers.index(
    memberConnection,
    {
      body: {
        employee_id: employee.id,
        is_active: true,
      } satisfies IHrmTimeTrackTimer.IRequest,
    },
  );
  typia.assert(timerList);
  // 6. Validate empty results
  TestValidator.equals("timer list data is empty", timerList.data.length, 0);
  TestValidator.equals(
    "pagination records is zero",
    timerList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    timerList.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page is 1",
    timerList.pagination.current === 1,
  );
}