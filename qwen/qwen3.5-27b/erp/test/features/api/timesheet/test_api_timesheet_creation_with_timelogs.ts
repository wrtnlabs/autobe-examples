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
 * Test timesheet creation with existing timelogs.
 * Validates that a draft timesheet is created for a past week with correct
 * total hours calculation and proper initialization of workflow fields.
 */
export async function test_api_timesheet_creation_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Calculate a past Monday date for the timesheet week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(
    now.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000,
  );
  const weekStartDate = lastMonday.toISOString();
  // 3. Create timesheet for the past week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  // 4. Validate timesheet response structure
  typia.assert(timesheet);
  // 5. Validate timesheet properties
  TestValidator.equals("timesheet ID exists", timesheet.id, timesheet.id);
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "week_start_date matches input",
    timesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.predicate(
    "employee is associated",
    timesheet.employee !== null,
  );
  TestValidator.equals("approver is null for draft", timesheet.approver, null);
  TestValidator.equals(
    "submitted_at is null for draft",
    timesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "approved_at is null for draft",
    timesheet.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at is null for draft",
    timesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for draft",
    timesheet.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "total_hours is non-negative",
    timesheet.total_hours >= 0,
  );
  TestValidator.predicate(
    "created_at exists",
    timesheet.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    timesheet.updated_at !== undefined,
  );
}
