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

/**
 * Test timesheet creation for a week with no time entries.
 * Validates that empty weeks can be created as draft timesheets with zero hours.
 */
export async function test_api_timesheet_creation_empty_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Calculate a past Monday date for the week start
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(
    now.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000,
  );
  const weekStartDate = lastMonday.toISOString();
  // 3. Create timesheet for empty week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 4. Validate timesheet properties
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals("total hours is zero", timesheet.total_hours, 0);
  TestValidator.equals(
    "week start date matches",
    timesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.predicate("employee exists", timesheet.employee !== null);
  TestValidator.predicate(
    "approver is null for draft",
    timesheet.approver === null,
  );
  TestValidator.predicate(
    "submitted_at is null",
    timesheet.submitted_at === null,
  );
  TestValidator.predicate(
    "approved_at is null",
    timesheet.approved_at === null,
  );
  TestValidator.predicate(
    "rejected_at is null",
    timesheet.rejected_at === null,
  );
  TestValidator.predicate(
    "rejection_reason is null",
    timesheet.rejection_reason === null,
  );
}
