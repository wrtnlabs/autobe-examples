import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_timesheets_create } from "../../../generate/generate_random_hrm_platform_admin_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test that the system prevents creating a duplicate timesheet for a week that already has a submitted or approved timesheet.
 *
 * This test validates the business rule that only one timesheet per employee per week can exist in submitted or approved status,
 * preventing duplicate timesheet creation for the same week.
 */
export async function test_api_timesheet_create_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Calculate a past Monday date for the timesheet week
  const now = new Date();
  const pastMonday = new Date(now);
  pastMonday.setDate(now.getDate() - 7 - now.getDay() + 1);
  pastMonday.setHours(0, 0, 0, 0);
  const weekStartDate = pastMonday.toISOString();
  // 3. Create first timesheet for the week (should succeed)
  const firstTimesheet =
    await generate_random_hrm_platform_admin_timesheets_create(
      adminConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(firstTimesheet);
  // 4. Verify first timesheet was created successfully
  TestValidator.equals(
    "first timesheet week matches",
    firstTimesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.predicate("first timesheet exists", firstTimesheet.id != null);
  // 5. Attempt to create duplicate timesheet for the same week (should fail)
  await TestValidator.error(
    "duplicate timesheet creation rejected",
    async () => {
      await generate_random_hrm_platform_admin_timesheets_create(
        adminConnection,
        {
          body: {
            week_start_date: weekStartDate,
          },
        },
      );
    },
  );
  // 6. Verify original timesheet remains unchanged
  TestValidator.equals(
    "original timesheet unchanged",
    firstTimesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.predicate(
    "original timesheet still valid",
    firstTimesheet.id != null,
  );
}
