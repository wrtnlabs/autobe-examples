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
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet submission workflow with timelog entries.
 *
 * Validates the complete timesheet submission flow including member authentication, timelog creation, timesheet creation, and timesheet submission. Ensures that the timesheet status transitions correctly from draft to submitted and that the submission timestamp is properly recorded.
 *
 * The test verifies that timelogs are automatically included in the timesheet for the corresponding week period, and that the submission process correctly updates the timesheet state. Special attention is given to validating the status change and submittedAt timestamp population.
 *
 * 1. Member registers and authenticates to access timesheet operations.
 * 2. Member creates a timelog entry for work performed on a project.
 * 3. Member creates a draft timesheet for the week period containing the timelog.
 * 4. Member submits the timesheet for approval.
 * 5. Validates timesheet status changed to 'submitted' and submittedAt is populated.
 */
export async function test_api_timesheet_submission_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create timelog entry
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {},
  );
  typia.assert(timelog);
  // 3. Create draft timesheet for the week containing the timelog
  const timelogDate = new Date(timelog.date);
  const dayOfWeek = timelogDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(timelogDate);
  mondayDate.setDate(timelogDate.getDate() + mondayOffset);
  mondayDate.setHours(0, 0, 0, 0);
  const weekStartDate = mondayDate.toISOString().split("T")[0];
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Verify timesheet is in draft status initially
  TestValidator.equals("initial status", timesheet.status, "draft");
  TestValidator.predicate("has timelogs", timesheet.timelogs.length > 0);
  // 5. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 6. Validate submission results
  TestValidator.equals(
    "status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is populated",
    submittedTimesheet.submittedAt !== null,
  );
  TestValidator.equals(
    "timesheet id unchanged",
    submittedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timelogs preserved",
    submittedTimesheet.timelogs.length,
    timesheet.timelogs.length,
  );
}