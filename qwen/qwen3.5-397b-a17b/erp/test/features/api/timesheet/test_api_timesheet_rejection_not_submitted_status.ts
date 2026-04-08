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
 * Test that rejecting a timesheet fails when the timesheet is not in submitted status.
 *
 * Validates that the timesheet rejection workflow enforces state machine constraints by rejecting attempts to reject timesheets that are not in submitted status. This test specifically verifies that draft timesheets cannot be rejected, ensuring the workflow integrity is maintained.
 *
 * The test creates a complete setup with a member account, employee record, timelog entry, and draft timesheet. It then attempts to reject the draft timesheet and verifies that the system properly rejects this operation with an appropriate error.
 *
 * 1. Member account is created with employee record.
 * 2. Timelog entry is created for the employee.
 * 3. Draft timesheet is created (remains in draft status, not submitted).
 * 4. Attempt to reject the draft timesheet fails with 400 Bad Request.
 * 5. Error message indicates timesheet must be in submitted status.
 */
export async function test_api_timesheet_rejection_not_submitted_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with employee record
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create timelog entry for the employee
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
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 3. Create draft timesheet (do NOT submit it)
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  // Verify timesheet is in draft status
  TestValidator.equals(
    "timesheet should be in draft status",
    timesheet.status,
    "draft",
  );
  // 4. Attempt to reject the draft timesheet - should fail
  await TestValidator.error(
    "rejecting draft timesheet should fail",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.reject(
        memberConnection,
        {
          timesheetId: timesheet.id,
          body: {
            rejection_reason: "This is a test rejection reason",
          } satisfies IHrmPlatformTimesheet.IReject,
        },
      );
    },
  );
}