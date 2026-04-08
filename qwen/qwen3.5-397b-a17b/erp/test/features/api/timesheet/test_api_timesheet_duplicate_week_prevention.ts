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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the business rule that prevents creating multiple timesheets for the same employee and week period.
 *
 * Validates that the system enforces a unique constraint on employee_id and week_start_date, ensuring only one timesheet can exist per employee per week. This test verifies data integrity for weekly time tracking by attempting to create duplicate timesheets and confirming the system properly rejects the second attempt.
 *
 * 1. Member registers with unique email and password credentials.
 * 2. Member creates an organization, automatically becoming the owner.
 * 3. Member creates a timesheet for a specific week (week starting 2026-03-30, a Monday).
 * 4. Member attempts to create another timesheet for the identical week_start_date.
 * 5. Verifies the duplicate creation request is rejected with a conflict error.
 *
 * Business validations:
 * - Only one timesheet per employee per week is allowed
 * - Duplicate week_start_date for same employee must be rejected
 * - System must enforce unique constraint on employee_id and week_start_date
 * - Error response must indicate the conflict clearly
 */
export async function test_api_timesheet_duplicate_week_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization (member becomes owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create first timesheet for a specific week (Monday 2026-03-30)
  const weekStartDate = "2026-03-30"; // Monday
  const firstTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(firstTimesheet);
  // 4. Attempt to create duplicate timesheet for the same week
  // 5. Verify the second creation is rejected with conflict error
  await TestValidator.error("duplicate week timesheet rejected", async () => {
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  });
}
