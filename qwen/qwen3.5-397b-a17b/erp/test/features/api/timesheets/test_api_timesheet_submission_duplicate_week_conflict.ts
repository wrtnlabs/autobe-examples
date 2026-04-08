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
 * Test timesheet submission duplicate week conflict validation.
 *
 * Validates the business rule that prevents multiple timesheets for the same week period. An employee creates and submits a timesheet for a specific week, then attempts to create another timesheet for the same week period. The system rejects the second creation with a conflict error.
 *
 * This test ensures that only one timesheet per employee per week is allowed, preventing duplicate time tracking for the same period. The validation occurs at timesheet creation time, checking for existing timesheets in submitted or approved status for the same week.
 *
 * 1. Member registers and authenticates to access timesheet operations.
 * 2. Member creates first timesheet for a specific week (Monday start date).
 * 3. Member submits the first timesheet, transitioning it to submitted status.
 * 4. Member attempts to create second timesheet for the same week period.
 * 5. System rejects the second creation with conflict error indicating duplicate week timesheet exists.
 */
export async function test_api_timesheet_submission_duplicate_week_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create first timesheet for a specific week (must be Monday)
  const weekStartDate = "2024-01-08"; // Monday
  const firstTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(firstTimesheet);
  TestValidator.equals(
    "first timesheet week start",
    firstTimesheet.weekStartDate,
    weekStartDate,
  );
  TestValidator.equals(
    "first timesheet status",
    firstTimesheet.status,
    "draft",
  );
  // 3. Submit first timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: firstTimesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted status",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is set",
    submittedTimesheet.submittedAt !== null &&
      submittedTimesheet.submittedAt !== undefined,
  );
  // 4. Attempt to create second timesheet for same week - should fail with conflict
  await TestValidator.error(
    "duplicate week timesheet creation rejected",
    async () => {
      await generate_random_hrm_platform_member_timesheets_create(
        memberConnection,
        {
          body: {
            week_start_date: weekStartDate,
          },
        },
      );
    },
  );
}
