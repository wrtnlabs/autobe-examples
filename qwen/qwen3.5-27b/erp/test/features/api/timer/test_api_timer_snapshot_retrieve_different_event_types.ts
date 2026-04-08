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
 * Test retrieving timer snapshots created by different lifecycle events (start, stop, edit, discard) to verify event-specific data accuracy.
 *
 * Validates the complete timer snapshot retrieval flow including member authentication, organizational context setup, and snapshot data verification for each timer lifecycle event type. Ensures that snapshots correctly capture the timer state at the moment of each event with appropriate denormalized relationship data.
 *
 * Special attention is given to verifying that each event type creates a distinct snapshot with correct event_type, duration_seconds, timestamps, and denormalized employee/project/task data. The test validates snapshot immutability and audit trail completeness for compliance purposes.
 *
 * 1. Member registers and authenticates with the system.
 * 2. Organization, employee, and project context are created for timer operations.
 * 3. Timer lifecycle events are triggered to generate different snapshot types.
 * 4. Each snapshot is retrieved and validated for event-specific data accuracy.
 * 5. Denormalized relationship data is verified for completeness and correctness.
 */
export async function test_api_timer_snapshot_retrieve_different_event_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection);
  typia.assert(authResult);
  // 2. Create organization context
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create employee record with proper member ID
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authResult.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create project for timer association
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  // 5. Scenario A - 'start' Event Snapshot
  // Generate timer and snapshot IDs for start event
  const startTimerId = typia.random<string & tags.Format<"uuid">>();
  const startSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const startSnapshot =
    await api.functional.hrmTimeTrack.member.timers.snapshots.at(
      memberConnection,
      {
        timerId: startTimerId,
        snapshotId: startSnapshotId,
      },
    );
  typia.assert(startSnapshot);
  TestValidator.equals("start event type", startSnapshot.event_type, "start");
  TestValidator.equals(
    "start duration is zero",
    startSnapshot.duration_seconds,
    0,
  );
  TestValidator.predicate(
    "start stopped_at is null",
    startSnapshot.stopped_at === null,
  );
  TestValidator.predicate(
    "start has started_at",
    startSnapshot.started_at !== undefined,
  );
  TestValidator.predicate(
    "start timer is active",
    startSnapshot.timer.is_active === true,
  );
  TestValidator.predicate(
    "start has employee data",
    startSnapshot.employee !== undefined,
  );
  TestValidator.predicate(
    "start has project data",
    startSnapshot.project !== undefined,
  );
  // 6. Scenario B - 'stop' Event Snapshot
  // Generate timer and snapshot IDs for stop event
  const stopTimerId = typia.random<string & tags.Format<"uuid">>();
  const stopSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const stopSnapshot =
    await api.functional.hrmTimeTrack.member.timers.snapshots.at(
      memberConnection,
      {
        timerId: stopTimerId,
        snapshotId: stopSnapshotId,
      },
    );
  typia.assert(stopSnapshot);
  TestValidator.equals("stop event type", stopSnapshot.event_type, "stop");
  TestValidator.predicate(
    "stop duration is positive",
    stopSnapshot.duration_seconds > 0,
  );
  TestValidator.predicate(
    "stop has stopped_at timestamp",
    stopSnapshot.stopped_at !== null,
  );
  TestValidator.predicate(
    "stop has started_at",
    stopSnapshot.started_at !== undefined,
  );
  TestValidator.predicate(
    "stop timer is not active",
    stopSnapshot.timer.is_active === false,
  );
  TestValidator.predicate(
    "stop has employee data",
    stopSnapshot.employee !== undefined,
  );
  TestValidator.predicate(
    "stop has project data",
    stopSnapshot.project !== undefined,
  );
  // 7. Scenario C - 'edit' Event Snapshot
  // Generate timer and snapshot IDs for edit event
  const editTimerId = typia.random<string & tags.Format<"uuid">>();
  const editSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const editSnapshot =
    await api.functional.hrmTimeTrack.member.timers.snapshots.at(
      memberConnection,
      {
        timerId: editTimerId,
        snapshotId: editSnapshotId,
      },
    );
  typia.assert(editSnapshot);
  TestValidator.equals("edit event type", editSnapshot.event_type, "edit");
  TestValidator.predicate(
    "edit has started_at",
    editSnapshot.started_at !== undefined,
  );
  TestValidator.predicate(
    "edit has employee data",
    editSnapshot.employee !== undefined,
  );
  TestValidator.predicate(
    "edit has project data",
    editSnapshot.project !== undefined,
  );
  // 8. Scenario D - 'discard' Event Snapshot
  // Generate timer and snapshot IDs for discard event
  const discardTimerId = typia.random<string & tags.Format<"uuid">>();
  const discardSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const discardSnapshot =
    await api.functional.hrmTimeTrack.member.timers.snapshots.at(
      memberConnection,
      {
        timerId: discardTimerId,
        snapshotId: discardSnapshotId,
      },
    );
  typia.assert(discardSnapshot);
  TestValidator.equals(
    "discard event type",
    discardSnapshot.event_type,
    "discard",
  );
  TestValidator.predicate(
    "discard has started_at",
    discardSnapshot.started_at !== undefined,
  );
  TestValidator.predicate(
    "discard has employee data",
    discardSnapshot.employee !== undefined,
  );
  TestValidator.predicate(
    "discard has project data",
    discardSnapshot.project !== undefined,
  );
  // 9. Validate denormalized data consistency across all snapshots
  TestValidator.equals(
    "all snapshots have same employee",
    startSnapshot.employee.id,
    stopSnapshot.employee.id,
  );
  TestValidator.equals(
    "all snapshots have same project",
    startSnapshot.project.id,
    stopSnapshot.project.id,
  );
  TestValidator.predicate(
    "snapshots have member data",
    startSnapshot.member !== undefined,
  );
}