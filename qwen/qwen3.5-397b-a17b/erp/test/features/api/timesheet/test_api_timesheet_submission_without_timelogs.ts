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
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test business rule validation that prevents submitting a timesheet without any timelog entries.
 *
 * Validates that the system enforces the business rule requiring at least one timelog entry before timesheet submission. An employee creates a draft timesheet for a week period but does not add any timelog entries. When attempting to submit the empty timesheet, the system rejects the request with an appropriate error indicating the timesheet has no timelogs.
 *
 * This test ensures employees cannot submit empty timesheets for approval, maintaining data integrity in the time tracking system. The validation occurs at the business logic layer, preventing invalid workflow transitions from draft to submitted status.
 *
 * 1. Member registers and authenticates to access timesheet operations.
 * 2. Member creates a draft timesheet for a specific week period without any timelog entries.
 * 3. Verify timesheet is in draft status with no timelogs.
 * 4. Member attempts to submit the empty timesheet.
 * 5. System rejects the submission with an error indicating no timelogs exist.
 */
export async function test_api_timesheet_submission_without_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create draft timesheet without any timelog entries
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Verify timesheet is in draft status with no timelogs
  TestValidator.equals("timesheet status", timesheet.status, "draft");
  TestValidator.equals("timelogs count", timesheet.timelogs.length, 0);
  // 4. Attempt to submit empty timesheet - should fail with business logic error
  await TestValidator.error("submit empty timesheet", async () => {
    await api.functional.hrmPlatform.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  });
}
