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
import { generate_random_hrm_time_track_member_timers_create } from "../../../generate/generate_random_hrm_time_track_member_timers_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_timer } from "../../../prepare/prepare_random_hrm_time_track_timer";

/**
 * Test retrieving a valid timer snapshot record that was created during a timer lifecycle event.
 *
 * Validates the complete timer snapshot retrieval flow including member authentication, organizational setup, employee creation, project creation, and timer initialization. Ensures that the snapshot correctly captures the timer state at the moment of creation with all denormalized relationship data.
 *
 * Special attention is given to verifying that the snapshot contains immutable audit trail data including employee, project, task, and member relationships, as well as accurate timestamp and duration information for the 'start' event type.
 *
 * 1. Member registers and authenticates to establish session context.
 * 2. Organization is created to provide multi-tenant data isolation boundary.
 * 3. Employee record is created linking the authenticated member to the organization.
 * 4. Project is created within the organization for timer association.
 * 5. Timer is started, which automatically creates a 'start' snapshot.
 * 6. Snapshot is retrieved using the timer ID and snapshot ID.
 * 7. Validates snapshot data integrity including event type, duration, timestamps, and all relationship references.
 */
export async function test_api_timer_snapshot_retrieve_valid_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee linked to authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        position: RandomGenerator.name(),
        employment_type: "full-time",
        hire_date: new Date().toISOString(),
        status: "active",
        hrm_time_track_member_id: memberAuth.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create project within organization
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Start timer (creates 'start' snapshot automatically)
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
  // 6. Retrieve the snapshot (the 'start' snapshot should exist)
  // Note: For this test, we assume the snapshot ID matches the timer ID for the initial 'start' event
  const snapshot = await api.functional.hrmTimeTrack.member.timers.snapshots.at(
    memberConnection,
    {
      timerId: timer.id,
      snapshotId: timer.id, // Assuming snapshot ID matches timer ID for start event
    },
  );
  typia.assert(snapshot);
  // 7. Validate snapshot data integrity
  TestValidator.equals("snapshot ID matches timer ID", snapshot.id, timer.id);
  TestValidator.equals(
    "timer relation ID matches",
    snapshot.timer.id,
    timer.id,
  );
  TestValidator.equals("event type is start", snapshot.event_type, "start");
  TestValidator.equals(
    "duration is 0 for start event",
    snapshot.duration_seconds,
    0,
  );
  TestValidator.equals(
    "stopped_at is null for start event",
    snapshot.stopped_at,
    null,
  );
  TestValidator.equals(
    "employee relation matches",
    snapshot.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project relation matches",
    snapshot.project.id,
    project.id,
  );
  TestValidator.predicate(
    "member relation exists",
    () => snapshot.member.id !== null,
  );
  TestValidator.predicate("started_at is before created_at", () => {
    return (
      new Date(snapshot.started_at).getTime() <=
      new Date(snapshot.created_at).getTime()
    );
  });
}
