import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that a draft timesheet can be created for a future calendar week.
 *
 * Validates the business rule that draft timesheet creation is permitted for future weeks — only the submission action is restricted for weeks that have not yet started. This test confirms the distinction between draft creation (always allowed regardless of week timing) and submission (restricted to past or current weeks per section 282).
 *
 * 1. Register a new member and authenticate with JWT access token.
 * 2. Compute the next Monday date that falls in the future.
 * 3. Create a draft timesheet for that future week via the generation utility.
 * 4. Verify the timesheet is in draft status with correct Monday-to-Sunday week boundaries.
 */
export async function test_api_timesheet_create_future_week_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Compute the next Monday in the future
  const now = new Date();
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const futureMondayStr = nextMonday.toISOString();
  // 3. Create a draft timesheet for the future week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: futureMondayStr,
      },
    },
  );
  typia.assert(timesheet);
  // 4. Validate timesheet properties
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  const actualMonday = new Date(timesheet.week_start_date);
  TestValidator.predicate(
    "week_start_date is the future Monday",
    () =>
      actualMonday.toISOString().split("T")[0] ===
      nextMonday.toISOString().split("T")[0],
  );
  const expectedEndDate = new Date(nextMonday);
  expectedEndDate.setDate(nextMonday.getDate() + 6);
  const actualEndDate = new Date(timesheet.week_end_date);
  TestValidator.predicate(
    "week_end_date is Sunday (Monday + 6 days)",
    () =>
      actualEndDate.toISOString().split("T")[0] ===
      expectedEndDate.toISOString().split("T")[0],
  );
}
