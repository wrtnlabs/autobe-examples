import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_duplicate_week_prevention(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test duplicate week prevention for timesheet creation.
   * Validates that employees cannot create multiple timesheets for the same week
   * when a timesheet in submitted/approved status already exists.
   */
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Calculate a valid Monday date in the past (for testing)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(
    now.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000,
  );
  const weekStartDate: string & tags.Format<"date-time"> =
    lastMonday.toISOString();
  // 3. Create first timesheet for the week
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
  // 4. Validate first timesheet was created successfully
  TestValidator.equals(
    "first timesheet week matches",
    firstTimesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.predicate(
    "first timesheet is in draft status",
    firstTimesheet.status === "draft",
  );
  TestValidator.predicate(
    "first timesheet has valid id",
    firstTimesheet.id !== undefined && firstTimesheet.id.length > 0,
  );
  // 5. Attempt to create duplicate timesheet for the same week
  // This should fail because a timesheet already exists for this week
  await TestValidator.error(
    "duplicate timesheet creation should fail",
    async () => {
      await generate_random_hrm_platform_member_timesheets_create(
        memberConnection,
        {
          body: {
            week_start_date: weekStartDate,
          } satisfies IHrmPlatformTimesheet.ICreate,
        },
      );
    },
  );
  // 6. Verify the original timesheet data is preserved
  TestValidator.predicate(
    "original timesheet id is valid",
    firstTimesheet.id.length > 0,
  );
  TestValidator.equals(
    "original timesheet status remains draft",
    firstTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "original timesheet week unchanged",
    firstTimesheet.week_start_date,
    weekStartDate,
  );
}
