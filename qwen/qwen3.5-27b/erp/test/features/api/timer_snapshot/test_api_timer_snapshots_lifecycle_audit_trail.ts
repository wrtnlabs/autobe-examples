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
 * Test retrieving timer snapshots for a timer that has gone through multiple lifecycle events.
 *
 * Validates the complete timer snapshot audit trail including start, edit, and discard events. Ensures that snapshots are correctly created for each timer lifecycle event and can be retrieved with proper pagination and filtering. Verifies that each snapshot contains accurate event type, duration, timestamps, and references to associated entities.
 *
 * Special attention is given to verifying that snapshots are sorted by created_at descending, pagination metadata is accurate, and filtering by event_type correctly returns only matching snapshots.
 *
 * 1. Authenticate a member to access timer snapshots.
 * 2. Create an organization context for employee and project setup.
 * 3. Create an employee record linking the authenticated member to the organization.
 * 4. Create a project for timer association.
 * 5. Start a timer to create the initial 'start' snapshot event.
 * 6. Edit the timer to create an 'edit' snapshot event.
 * 7. Discard the timer to create a 'discard' snapshot event.
 * 8. Retrieve all snapshots and validate pagination, sorting, and snapshot content.
 * 9. Test filtering by event_type to verify correct snapshot filtering.
 */
export async function test_api_timer_snapshots_lifecycle_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: memberAuth.id,
        position: RandomGenerator.paragraph({ sentences: 2 }),
        employment_type: "full-time",
        hire_date: new Date().toISOString(),
        status: "active",
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Start timer (creates 'start' snapshot)
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
  // Wait a moment to ensure time difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Edit timer (creates 'edit' snapshot)
  const updatedTimer = await api.functional.hrmTimeTrack.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(updatedTimer);
  // Wait a moment to ensure time difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Discard timer (creates 'discard' snapshot)
  await api.functional.hrmTimeTrack.member.timers.erase(memberConnection, {
    timerId: timer.id,
  });
  // 8. Retrieve all snapshots
  const snapshotsResponse =
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
  typia.assert(snapshotsResponse);
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    100,
  );
  TestValidator.predicate("has snapshots", snapshotsResponse.data.length >= 3);
  TestValidator.equals(
    "pagination records matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  // Validate snapshots are sorted by created_at descending
  for (let i = 1; i < snapshotsResponse.data.length; i++) {
    TestValidator.predicate(
      `snapshot ${i} created_at <= snapshot ${i - 1} created_at`,
      new Date(snapshotsResponse.data[i].created_at).getTime() <=
        new Date(snapshotsResponse.data[i - 1].created_at).getTime(),
    );
  }
  // Validate snapshot content - check for expected event types
  const eventTypes = snapshotsResponse.data.map((s) => s.event_type);
  TestValidator.predicate("has start event", eventTypes.includes("start"));
  TestValidator.predicate("has edit event", eventTypes.includes("edit"));
  TestValidator.predicate("has discard event", eventTypes.includes("discard"));
  // Validate each snapshot has required fields
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} has non-negative duration_seconds`,
      snapshot.duration_seconds >= 0,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has started_at`,
      snapshot.started_at !== null,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has employee reference`,
      snapshot.employee !== null,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has project reference`,
      snapshot.project !== null,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has creator reference`,
      snapshot.creator !== null,
    );
  }
  // 9. Test filtering by event_type
  const startSnapshots =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          event_type: "start",
        },
      },
    );
  typia.assert(startSnapshots);
  TestValidator.equals(
    "filtered start events count",
    startSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "filtered snapshot event_type is start",
    startSnapshots.data[0].event_type,
    "start",
  );
  const discardSnapshots =
    await api.functional.hrmTimeTrack.member.timers.snapshots.index(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          event_type: "discard",
        },
      },
    );
  typia.assert(discardSnapshots);
  TestValidator.equals(
    "filtered discard events count",
    discardSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "filtered snapshot event_type is discard",
    discardSnapshots.data[0].event_type,
    "discard",
  );
}
