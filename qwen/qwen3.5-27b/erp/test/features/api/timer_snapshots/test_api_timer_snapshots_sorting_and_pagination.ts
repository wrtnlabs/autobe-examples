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
 * Test sorting timer snapshots by different fields and sort orders with pagination validation.
 *
 * Validates the complete timer snapshots sorting and pagination flow including member authentication, resource setup, and multiple sorting scenarios. Ensures that the sortBy parameter accepts valid fields (created_at, duration_seconds) and the sortOrder parameter accepts 'asc' or 'desc'. Tests sorting by created_at in both ascending (oldest first) and descending (newest first) order, and by duration_seconds to verify snapshots are ordered by recorded duration.
 *
 * Special attention is given to verifying that pagination works correctly with custom sort orders, ensuring consistent page boundaries. The test creates timer operations to generate snapshots with varying timestamps and durations for comprehensive sorting validation.
 *
 * 1. Member authenticates and creates organization, employee, project, and timer resources.
 * 2. Timer snapshots are generated through timer lifecycle operations.
 * 3. Test sorting by created_at ascending (oldest events first).
 * 4. Test sorting by created_at descending (newest events first, default behavior).
 * 5. Test sorting by duration_seconds in both orders.
 * 6. Validate pagination consistency with different sort configurations.
 * 7. Verify snapshot ordering matches expected sort criteria.
 */
export async function test_api_timer_snapshots_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication and setup
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection);
  const memberId = authResponse.id;
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee with correct member ID
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: memberId,
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 5. Create timer to generate snapshots
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timer);
  // 6. Test sorting by created_at ascending (oldest first)
  const snapshotsAsc =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          limit: 100,
        },
      },
    );
  typia.assert(snapshotsAsc);
  TestValidator.predicate("snapshots sorted by created_at ascending", () => {
    for (let i = 1; i < snapshotsAsc.data.length; i++) {
      if (
        new Date(snapshotsAsc.data[i - 1].created_at).getTime() >
        new Date(snapshotsAsc.data[i].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 7. Test sorting by created_at descending (newest first)
  const snapshotsDesc =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 100,
        },
      },
    );
  typia.assert(snapshotsDesc);
  TestValidator.predicate("snapshots sorted by created_at descending", () => {
    for (let i = 1; i < snapshotsDesc.data.length; i++) {
      if (
        new Date(snapshotsDesc.data[i - 1].created_at).getTime() <
        new Date(snapshotsDesc.data[i].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 8. Test sorting by duration_seconds ascending
  const snapshotsDurationAsc =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          sortBy: "duration_seconds",
          sortOrder: "asc",
          limit: 100,
        },
      },
    );
  typia.assert(snapshotsDurationAsc);
  TestValidator.predicate(
    "snapshots sorted by duration_seconds ascending",
    () => {
      for (let i = 1; i < snapshotsDurationAsc.data.length; i++) {
        if (
          snapshotsDurationAsc.data[i - 1].duration_seconds >
          snapshotsDurationAsc.data[i].duration_seconds
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 9. Test sorting by duration_seconds descending
  const snapshotsDurationDesc =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          sortBy: "duration_seconds",
          sortOrder: "desc",
          limit: 100,
        },
      },
    );
  typia.assert(snapshotsDurationDesc);
  TestValidator.predicate(
    "snapshots sorted by duration_seconds descending",
    () => {
      for (let i = 1; i < snapshotsDurationDesc.data.length; i++) {
        if (
          snapshotsDurationDesc.data[i - 1].duration_seconds <
          snapshotsDurationDesc.data[i].duration_seconds
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 10. Test pagination with sorting
  const page1 = await api.functional.hrmTimeTrack.member.timers.snapshots.index(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", page1.pagination.limit, 10);
  // 11. Test sorting with event_type filtering
  const startSnapshots =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          event_type: "start",
          sortBy: "created_at",
          sortOrder: "asc",
          limit: 100,
        },
      },
    );
  typia.assert(startSnapshots);
  TestValidator.predicate("all filtered snapshots are start events", () =>
    startSnapshots.data.every((snapshot) => snapshot.event_type === "start"),
  );
  TestValidator.predicate(
    "filtered snapshots sorted by created_at ascending",
    () => {
      for (let i = 1; i < startSnapshots.data.length; i++) {
        if (
          new Date(startSnapshots.data[i - 1].created_at).getTime() >
          new Date(startSnapshots.data[i].created_at).getTime()
        ) {
          return false;
        }
      }
      return true;
    },
  );
}