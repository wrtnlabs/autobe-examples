import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test creating a timesheet with an explicitly provided week_end_date.
 * An authenticated employee creates a timesheet specifying both week_start_date
 * and a custom week_end_date that differs from the default 7-day span.
 * Verifies the returned timesheet preserves the explicitly provided week_end_date.
 */
export async function test_api_timesheet_create_with_explicit_week_end_date(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization to establish the required organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Define custom week boundaries with a non-standard 3-day span (not default 6)
  const weekStartDate = new Date();
  weekStartDate.setUTCHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 3); // Explicitly 3 days, not 6
  // Create timesheet with explicit week_end_date
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate.toISOString(),
        weekEndDate: weekEndDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify the explicit week_end_date is preserved (not auto-calculated)
  TestValidator.equals(
    "weekEndDate matches explicit value",
    timesheet.weekEndDate,
    weekEndDate.toISOString(),
  );
  // Verify default behaviors are maintained
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.equals("submittedAt is null", timesheet.submittedAt, null);
  TestValidator.equals("reviewedAt is null", timesheet.reviewedAt, null);
  TestValidator.equals(
    "rejectionReason is null",
    timesheet.rejectionReason,
    null,
  );
  TestValidator.equals("reviewedBy is null", timesheet.reviewedBy, null);
}
