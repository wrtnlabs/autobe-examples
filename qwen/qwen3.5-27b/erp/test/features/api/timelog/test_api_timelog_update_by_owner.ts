import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";

/**
 * Test the primary success path for updating a timelog entry by its owner.
 *
 * Validates that an authenticated member can update their own timelog's date, duration, billable status, and notes. The test verifies that the timelog is successfully updated with new values, the updated_at timestamp is refreshed, and the response includes the complete updated timelog with all relationships (employee, project, task).
 *
 * Special attention is given to verifying that the created_at timestamp remains unchanged while updated_at is refreshed, and that all relationships (employee, project, task) are preserved after the update.
 *
 * 1. Authenticate as member using authorize_member_join utility
 * 2. Create a timelog entry using generate_random_hrm_time_track_member_timelogs_create utility
 * 3. Update the timelog with new values (date, duration, billable status, notes)
 * 4. Validate that the response contains the updated timelog with all relationships
 * 5. Verify the updated_at timestamp is different from created_at
 * 6. Verify that the updated values match the input
 */
export async function test_api_timelog_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a timelog entry
  const originalTimelog: IHrmTimeTrackTimelog =
    await generate_random_hrm_time_track_member_timelogs_create(
      memberConnection,
      {},
    );
  typia.assert(originalTimelog);
  // Store original timestamps for comparison
  const originalCreatedAt: string = originalTimelog.created_at;
  const originalUpdatedAt: string = originalTimelog.updated_at;
  // 3. Prepare update data with new values
  const updateBody = {
    date: new Date(Date.now() + 86400000).toISOString(),
    duration_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<3600>
    >(),
    billable: !originalTimelog.billable,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackTimelog.IUpdate;
  // 4. Update the timelog
  const updatedTimelog: IHrmTimeTrackTimelog =
    await api.functional.hrmTimeTrack.member.timelogs.update(memberConnection, {
      timelogId: originalTimelog.id,
      body: updateBody,
    });
  typia.assert(updatedTimelog);
  // 5. Validate the updated timelog
  TestValidator.equals(
    "timelog ID unchanged",
    updatedTimelog.id,
    originalTimelog.id,
  );
  TestValidator.equals("date updated", updatedTimelog.date, updateBody.date);
  TestValidator.equals(
    "duration updated",
    updatedTimelog.duration_seconds,
    updateBody.duration_seconds,
  );
  TestValidator.equals(
    "billable status updated",
    updatedTimelog.billable,
    updateBody.billable,
  );
  TestValidator.equals("notes updated", updatedTimelog.notes, updateBody.notes);
  // 6. Verify timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedTimelog.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedTimelog.updated_at,
    originalUpdatedAt,
  );
  // 7. Verify relationships are preserved
  TestValidator.equals(
    "employee preserved",
    updatedTimelog.employee.id,
    originalTimelog.employee.id,
  );
  TestValidator.equals(
    "project preserved",
    updatedTimelog.project.id,
    originalTimelog.project.id,
  );
  TestValidator.equals(
    "task preserved",
    updatedTimelog.task?.id ?? null,
    originalTimelog.task?.id ?? null,
  );
}
