import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test weekly summary report returns empty weeks array for new organization with no timelogs.
 *
 * Validates that the weekly summary report endpoint gracefully handles empty
 * result sets by returning a 200 response with an empty `weeks` array rather
 * than a 404 error, null, or absent field. A newly authenticated member in a
 * fresh organization has no time entries logged, so calling the report endpoint
 * must produce an empty aggregation result that still conforms to the
 * `IErpHrmWeeklySummaryReport` schema structure.
 *
 * This edge case is critical for API consumers who should be able to uniformly
 * iterate over `weeks` without special-case null checks or error handling for
 * empty data scenarios.
 *
 * 1. Authenticate as a new member using the join utility, which creates a fresh
 *    organization context with no timelogs.
 * 2. Call the weekly summary report endpoint with the authenticated connection.
 * 3. Validate the full response against the `IErpHrmWeeklySummaryReport` schema.
 * 4. Confirm the `weeks` field is an empty array.
 */
export async function test_api_weekly_summary_report_no_matching_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member in a fresh organization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call the weekly summary report endpoint
  const report =
    await api.functional.erpHrm.member.reports.weekly_summary.at(
      memberConnection,
    );
  typia.assert(report);
  // 3. Validate the weeks array is empty
  TestValidator.equals("weeks is empty array", report.weeks, []);
}
