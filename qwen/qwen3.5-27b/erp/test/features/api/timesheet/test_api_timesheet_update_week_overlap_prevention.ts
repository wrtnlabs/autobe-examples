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
 * Test that updating a timesheet's week_start_date is rejected when it would overlap with an existing submitted or approved timesheet for the same employee.
 *
 * This test validates the business rule that only one timesheet per employee per week can exist in submitted or approved status.
 * It prevents duplicate timesheet submissions for the same week by rejecting update attempts that would cause overlap.
 */
export async function test_api_timesheet_update_week_overlap_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.hrmPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: "admin@overlap-test.com",
        password: "12345678",
        href: "https://hrm.example.com/admin/join",
        referrer: "https://hrm.example.com/admin",
        ip: "192.168.1.100",
      } satisfies IHrmPlatformAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Create a draft timesheet for week A (2026-03-16)
  const weekA_start = new Date("2026-03-16T00:00:00Z");
  const draftTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.create(adminConnection, {
      body: {
        week_start_date: weekA_start.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    });
  typia.assert(draftTimesheet);
  // 3. Create a timesheet for week B (2026-03-23) - this will block overlap
  const weekB_start = new Date("2026-03-23T00:00:00Z");
  const blockingTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.create(adminConnection, {
      body: {
        week_start_date: weekB_start.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    });
  typia.assert(blockingTimesheet);
  // 4. Attempt to update the draft timesheet's week_start_date to week B (2026-03-23)
  // This should be rejected due to overlap with the blocking timesheet
  await TestValidator.error(
    "update rejected due to week overlap with existing timesheet",
    async () => {
      await api.functional.hrmPlatform.admin.timesheets.update(
        adminConnection,
        {
          timesheetId: draftTimesheet.id,
          body: {
            week_start_date: weekB_start.toISOString(),
          } satisfies IHrmPlatformTimesheet.IUpdate,
        },
      );
    },
  );
  // 5. Verify the timesheets have different week_start_dates (business rule validation)
  TestValidator.notEquals(
    "timesheets have different week_start_dates",
    draftTimesheet.week_start_date,
    blockingTimesheet.week_start_date,
  );
  // 6. Verify both timesheets were created successfully with valid UUIDs
  TestValidator.predicate(
    "draft timesheet has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      draftTimesheet.id,
    ),
  );
  TestValidator.predicate(
    "blocking timesheet has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      blockingTimesheet.id,
    ),
  );
  // 7. Verify timesheet IDs are different
  TestValidator.notEquals(
    "timesheets have different IDs",
    draftTimesheet.id,
    blockingTimesheet.id,
  );
}
