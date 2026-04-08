import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that an employee can successfully update their own timelog when it is not part of an approved timesheet.
 *
 * Validates the complete timelog update workflow including member authentication, timelog creation, and update operations. Ensures that the employee can modify their own timelog fields (duration, description, billable flag) when the timelog is not locked by an approved timesheet.
 *
 * Special attention is given to verifying that updated fields reflect the new values while non-updated fields (date, project, employee) remain unchanged, and that the updated_at timestamp is properly incremented.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Creates a timelog for work performed on a project.
 * 3. Updates the timelog with new duration, description, and billable status.
 * 4. Validates all updated fields match the update payload and timestamps are correct.
 */
export async function test_api_timelog_update_by_owner_in_draft_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create initial timelog
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: typia.random<string & tags.Format<"uuid">>(),
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // Verify timelog is not in approved timesheet (can be null or draft)
  TestValidator.predicate(
    "timelog not in approved timesheet",
    timelog.timesheet === null ||
      timelog.timesheet === undefined ||
      timelog.timesheet.status === "draft",
  );
  // 3. Prepare update payload with new values
  const updatePayload = {
    durationMinutes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    billable: false,
  } satisfies IHrmPlatformTimelog.IUpdate;
  // Store original values for comparison
  const originalDate = timelog.date;
  const originalProjectId = timelog.project.id;
  const originalEmployeeId = timelog.employee.id;
  // 4. Update the timelog
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(memberConnection, {
      timelogId: timelog.id,
      body: updatePayload,
    });
  typia.assert(updatedTimelog);
  // 5. Validate updated fields
  TestValidator.equals(
    "duration_minutes updated",
    updatedTimelog.duration_minutes,
    updatePayload.durationMinutes,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "billable flag updated",
    updatedTimelog.billable,
    updatePayload.billable,
  );
  // 6. Validate non-updated fields remain unchanged
  TestValidator.equals("date unchanged", updatedTimelog.date, originalDate);
  TestValidator.equals(
    "project unchanged",
    updatedTimelog.project.id,
    originalProjectId,
  );
  TestValidator.equals(
    "employee unchanged",
    updatedTimelog.employee.id,
    originalEmployeeId,
  );
  TestValidator.equals("id unchanged", updatedTimelog.id, timelog.id);
  // 7. Validate timestamps
  TestValidator.predicate(
    "updated_at is newer or equal to created_at",
    new Date(updatedTimelog.updated_at).getTime() >=
      new Date(updatedTimelog.created_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at is newer than original updated_at",
    new Date(updatedTimelog.updated_at).getTime() >=
      new Date(timelog.updated_at).getTime(),
  );
  // 8. Validate relations are correctly returned
  TestValidator.equals(
    "employee relation preserved",
    updatedTimelog.employee.id,
    member.id,
  );
  TestValidator.predicate(
    "project relation exists",
    updatedTimelog.project !== null && updatedTimelog.project !== undefined,
  );
}