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
 * Test viewing an employee's active timer through the timer listing endpoint.
 *
 * Validates the complete timer listing flow including member authentication, organization setup, employee creation, project assignment, and active timer retrieval. Ensures that the timer list endpoint correctly returns active timers with proper data isolation (employees can only view their own timers).
 *
 * Special attention is given to verifying that the timer summary includes all required fields such as timer ID, start timestamp, active status, employee information, project details, and optional task assignment. Pagination metadata is also validated to ensure proper list response structure.
 *
 * 1. Register and authenticate as a member.
 * 2. Create an organization for the employee context.
 * 3. Create an employee record linked to the authenticated member.
 * 4. Create a project within the organization.
 * 5. Start an active timer for the employee with the project assigned.
 * 6. Call the timer list endpoint to retrieve active timers.
 * 7. Validate the response contains exactly one active timer with correct fields.
 */
export async function test_api_timer_list_with_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create an employee record linked to the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Create a project within the organization
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Start an active timer for the employee with the project assigned
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(timer);
  // 6. Call the timer list endpoint to retrieve active timers
  const timerList = await api.functional.hrmTimeTrack.member.timers.index(
    memberConnection,
    {
      body: {
        is_active: true,
      } satisfies IHrmTimeTrackTimer.IRequest,
    },
  );
  typia.assert(timerList);
  // 7. Validate the response contains exactly one active timer
  TestValidator.equals("timer count", timerList.data.length, 1);
  // 8. Validate the active timer fields
  const activeTimer = timerList.data[0];
  TestValidator.equals("timer ID matches", activeTimer.id, timer.id);
  TestValidator.equals("is_active flag", activeTimer.is_active, true);
  TestValidator.equals(
    "employee ID matches",
    activeTimer.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project ID matches",
    activeTimer.project.id,
    project.id,
  );
  TestValidator.predicate(
    "started_at is valid",
    activeTimer.started_at !== null,
  );
  TestValidator.predicate(
    "description exists",
    activeTimer.description !== null,
  );
  // 9. Validate pagination metadata
  TestValidator.equals("current page", timerList.pagination.current, 1);
  TestValidator.equals("limit", timerList.pagination.limit, 100);
  TestValidator.equals("total records", timerList.pagination.records, 1);
  TestValidator.equals("total pages", timerList.pagination.pages, 1);
}
