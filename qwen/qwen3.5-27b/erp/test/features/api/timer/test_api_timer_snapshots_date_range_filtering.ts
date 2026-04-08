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
import type { IHrmTimeTrackTimerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimerSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTimerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimerSnapshot";
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
 * Test filtering timer snapshots by date range using created_at_from and created_at_to parameters.
 *
 * Validates the complete timer snapshot filtering workflow including member authentication, organizational setup, timer creation with multiple lifecycle events, and date range filtering. Ensures that filtering by date range returns only snapshots created within the specified time window and that pagination metadata accurately reflects the filtered results.
 *
 * Special attention is given to verifying edge cases: filtering with only created_at_from (returns snapshots from that date forward), filtering with only created_at_to (returns snapshots up to that date), and filtering with a range that matches no snapshots (returns empty data array with pagination showing 0 records).
 *
 * 1. Authenticate member and create organizational context (organization, employee, project).
 * 2. Create a timer and generate snapshots through lifecycle events.
 * 3. Test filtering with both created_at_from and created_at_to boundaries.
 * 4. Test filtering with only created_at_from (from date forward).
 * 5. Test filtering with only created_at_to (up to date).
 * 6. Test filtering with a range that matches no snapshots (empty results).
 * 7. Validate pagination metadata reflects filtered result counts accurately.
 */
export async function test_api_timer_snapshots_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and create organizational context
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResponse);
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authResponse.id,
      },
    },
  );
  typia.assert(employee);
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 2. Create a timer and generate snapshots
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timer);
  // Get initial snapshots (should have at least one "start" event)
  const initialSnapshots =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(initialSnapshots);
  // Get the timestamps of existing snapshots for date range testing
  const snapshotTimestamps = initialSnapshots.data.map((s) => s.created_at);
  if (snapshotTimestamps.length === 0) {
    throw new Error("No snapshots generated for timer");
  }
  // Sort timestamps to get min and max
  const sortedTimestamps = [...snapshotTimestamps].sort();
  const earliestSnapshot = sortedTimestamps[0];
  const latestSnapshot = sortedTimestamps[sortedTimestamps.length - 1];
  // 3. Test filtering with both created_at_from and created_at_to
  const filteredBoth =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: earliestSnapshot,
          created_at_to: latestSnapshot,
        },
      },
    );
  typia.assert(filteredBoth);
  TestValidator.equals(
    "filter both boundaries returns all snapshots",
    filteredBoth.pagination.records,
    initialSnapshots.pagination.records,
  );
  // Verify all returned snapshots are within the date range
  for (const snapshot of filteredBoth.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} is within date range`,
      snapshot.created_at >= earliestSnapshot &&
        snapshot.created_at <= latestSnapshot,
    );
  }
  // 4. Test filtering with only created_at_from (from date forward)
  const midPoint = new Date(
    new Date(earliestSnapshot).getTime() +
      (new Date(latestSnapshot).getTime() -
        new Date(earliestSnapshot).getTime()) /
        2,
  ).toISOString();
  const filteredFrom =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: midPoint,
        },
      },
    );
  typia.assert(filteredFrom);
  // All returned snapshots should be >= midPoint
  for (const snapshot of filteredFrom.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} is after created_at_from`,
      snapshot.created_at >= midPoint,
    );
  }
  // Validate pagination for filteredFrom
  TestValidator.equals(
    "filteredFrom pagination records matches data length",
    filteredFrom.pagination.records,
    filteredFrom.data.length,
  );
  TestValidator.predicate(
    "filteredFrom pagination current is 1",
    filteredFrom.pagination.current === 1,
  );
  // 5. Test filtering with only created_at_to (up to date)
  const filteredTo =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          page: 1,
          limit: 100,
          created_at_to: midPoint,
        },
      },
    );
  typia.assert(filteredTo);
  // All returned snapshots should be <= midPoint
  for (const snapshot of filteredTo.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} is before created_at_to`,
      snapshot.created_at <= midPoint,
    );
  }
  // Validate pagination for filteredTo
  TestValidator.equals(
    "filteredTo pagination records matches data length",
    filteredTo.pagination.records,
    filteredTo.data.length,
  );
  TestValidator.predicate(
    "filteredTo pagination current is 1",
    filteredTo.pagination.current === 1,
  );
  // 6. Test filtering with a range that matches no snapshots (empty results)
  // Use a date range far in the future where no snapshots exist
  const futureDate = new Date(
    new Date().getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureDate2 = new Date(
    new Date().getTime() + 730 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filteredEmpty =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: futureDate,
          created_at_to: futureDate2,
        },
      },
    );
  typia.assert(filteredEmpty);
  // Validate empty results
  TestValidator.equals(
    "empty filter returns 0 records",
    filteredEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter returns empty data array",
    filteredEmpty.data.length,
    0,
  );
  TestValidator.predicate(
    "empty filter pagination pages is 0",
    filteredEmpty.pagination.pages === 0,
  );
  TestValidator.equals(
    "empty filter pagination current is 1",
    filteredEmpty.pagination.current,
    1,
  );
  // 7. Test date range filter combined with event_type filter
  const filteredCombined =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: earliestSnapshot,
          created_at_to: latestSnapshot,
          event_type: "start",
        },
      },
    );
  typia.assert(filteredCombined);
  // All returned snapshots should be "start" events and within date range
  for (const snapshot of filteredCombined.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} event_type is start`,
      snapshot.event_type,
      "start",
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} is within date range`,
      snapshot.created_at >= earliestSnapshot &&
        snapshot.created_at <= latestSnapshot,
    );
  }
  // Validate pagination for combined filter
  TestValidator.equals(
    "combined filter pagination records matches data length",
    filteredCombined.pagination.records,
    filteredCombined.data.length,
  );
  TestValidator.predicate(
    "combined filter pagination records <= initial records",
    filteredCombined.pagination.records <= initialSnapshots.pagination.records,
  );
}
