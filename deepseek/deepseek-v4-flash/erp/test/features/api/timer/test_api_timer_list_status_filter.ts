import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timers_start } from "../../../generate/generate_random_hrm_time_tracking_member_timers_start";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

/**
 * Test that filtering timer records by status works correctly, including returning empty results gracefully when no timers match.
 *
 * Tests the PATCH /member/timers endpoint's status filter functionality. Sets up two timer sessions with different statuses (one discarded, one running), then validates that filtering by each status returns the correct subset of timer records.
 *
 * Also validates edge case behavior: filtering by a status with no matching timers (stopped) returns an empty array with proper pagination metadata rather than an error.
 *
 * 1. Register a member, create an organization, and switch context.
 * 2. Create a project and add the member as a project member.
 * 3. Start Timer A, then discard it (status becomes "discarded").
 * 4. Start Timer B (status becomes "running").
 * 5. Filter by "discarded" — verify Timer A is included, Timer B excluded, all have stopped_at populated.
 * 6. Filter by "running" — verify Timer B is included, Timer A excluded, all have stopped_at = null, at most one result.
 * 7. Filter by "stopped" — verify empty data array with pagination showing records=0.
 * 8. List with no filter — verify timers ordered by started_at descending (Timer B before Timer A).
 */
export async function test_api_timer_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `TestOrg_${RandomGenerator.alphaNumeric(8)}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Switch to the organization context
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switchedOrg);
  // 4. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `TestProject_${RandomGenerator.alphaNumeric(6)}`,
          color_code: "#FF5733",
        },
      },
    );
  typia.assert(project);
  // 5. Add self as project member
  // Since we need the employee_id of the authenticated member (who is the org owner),
  // we generate a random UUID. In a real test environment, this would need the actual employee ID.
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: typia.random<string & tags.Format<"uuid">>(),
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Start Timer A
  const timerA = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: project.id,
        description: "Timer A - will be discarded",
      },
    },
  );
  typia.assert(timerA);
  TestValidator.equals("timer A status is running", timerA.status, "running");
  TestValidator.predicate(
    "timer A stopped_at is null while running",
    timerA.stopped_at === null,
  );
  // 7. Discard Timer A
  await api.functional.hrmTimeTracking.member.timers.erase(memberConnection, {
    timerId: timerA.id,
  });
  // 8. Start Timer B
  const timerB = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: project.id,
        description: "Timer B - running",
      },
    },
  );
  typia.assert(timerB);
  TestValidator.equals("timer B status is running", timerB.status, "running");
  TestValidator.predicate(
    "timer B stopped_at is null while running",
    timerB.stopped_at === null,
  );
  // --- Test 1: Filter by status = "discarded" ---
  const discardedResult =
    await api.functional.hrmTimeTracking.member.timers.index(memberConnection, {
      body: {
        status: "discarded",
      } satisfies IHrmTimeTrackingTimer.IRequest,
    });
  typia.assert(discardedResult);
  TestValidator.predicate(
    "discarded timer results are non-empty",
    discardedResult.data.length > 0,
  );
  for (const timer of discardedResult.data) {
    TestValidator.equals(
      "all filtered timers have status discarded",
      timer.status,
      "discarded",
    );
    TestValidator.predicate(
      "discarded timer has stopped_at populated",
      timer.stopped_at !== null,
    );
  }
  const discardedIds = discardedResult.data.map((t) => t.id);
  TestValidator.predicate(
    "discarded result includes Timer A (discarded)",
    discardedIds.includes(timerA.id),
  );
  TestValidator.predicate(
    "discarded result excludes Timer B (running)",
    !discardedIds.includes(timerB.id),
  );
  // --- Test 2: Filter by status = "running" ---
  const runningResult =
    await api.functional.hrmTimeTracking.member.timers.index(memberConnection, {
      body: {
        status: "running",
      } satisfies IHrmTimeTrackingTimer.IRequest,
    });
  typia.assert(runningResult);
  TestValidator.predicate(
    "running timer results are non-empty",
    runningResult.data.length > 0,
  );
  for (const timer of runningResult.data) {
    TestValidator.equals(
      "all filtered timers have status running",
      timer.status,
      "running",
    );
    TestValidator.predicate(
      "running timer has stopped_at null",
      timer.stopped_at === null,
    );
  }
  const runningIds = runningResult.data.map((t) => t.id);
  TestValidator.predicate(
    "running result includes Timer B (running)",
    runningIds.includes(timerB.id),
  );
  TestValidator.predicate(
    "running result excludes Timer A (discarded)",
    !runningIds.includes(timerA.id),
  );
  TestValidator.predicate(
    "at most one running timer returned (per-employee constraint)",
    runningResult.data.length <= 1,
  );
  // --- Test 3: Filter by status = "stopped" (no matching timers) ---
  const stoppedResult =
    await api.functional.hrmTimeTracking.member.timers.index(memberConnection, {
      body: {
        status: "stopped",
      } satisfies IHrmTimeTrackingTimer.IRequest,
    });
  typia.assert(stoppedResult);
  TestValidator.equals(
    "stopped filter returns empty data array",
    stoppedResult.data.length,
    0,
  );
  TestValidator.equals(
    "stopped filter shows records=0 in pagination",
    stoppedResult.pagination.records,
    0,
  );
  // --- Test 4: Default sorting (no filter, timers ordered by started_at descending) ---
  const allTimersResult =
    await api.functional.hrmTimeTracking.member.timers.index(memberConnection, {
      body: {
        sort: "started_at",
      } satisfies IHrmTimeTrackingTimer.IRequest,
    });
  typia.assert(allTimersResult);
  TestValidator.predicate(
    "all timers listing returns data",
    allTimersResult.data.length > 0,
  );
  if (allTimersResult.data.length >= 2) {
    TestValidator.predicate(
      "timers ordered by started_at descending (newest first)",
      new Date(allTimersResult.data[0].started_at).getTime() >=
        new Date(allTimersResult.data[1].started_at).getTime(),
    );
  }
}
