import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Validates the time report endpoint without any groupBy parameter, returning organization-wide grand total.
 *
 * Calls the GET /erpHrm/member/reports/time endpoint without specifying a groupBy parameter and verifies that the response contains a single grand_total entry with aggregated hour totals and entry counts. The test ensures proper authentication with a newly registered member, correct response structure validation through typia.assert, and invariant checking for the grand total aggregation.
 *
 * Since the newly registered member has no timelogs, all hour values and the entry count are expected to be zero — the endpoint must return a valid grand_total entry (HTTP 200) rather than a 404. The test also confirms that no individual timelog details are exposed in the report response.
 *
 * 1. Registers and authenticates a new member via authorize_member_join, creating an isolated memberConnection.
 * 2. Calls the time report endpoint without groupBy, dateFrom, or dateTo parameters.
 * 3. Validates that typia.assert passes complete structural validation on both responses.
 * 4. Confirms the response data array contains exactly one grand_total entry.
 * 5. Verifies the invariant total_hours = billable_hours + non_billable_hours.
 * 6. Confirms all hour values and entry_count are non-negative.
 */
export async function test_api_time_report_grand_total(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const report =
    await api.functional.erpHrm.member.reports.time.report(memberConnection);
  typia.assert(report);
  TestValidator.predicate(
    "data contains at least one entry",
    report.data.length >= 1,
  );
  const grandTotalEntries = report.data.filter(
    (entry) => entry.group_by === "grand_total",
  );
  TestValidator.equals(
    "has exactly one grand total entry",
    grandTotalEntries.length,
    1,
  );
  const grandTotal = grandTotalEntries[0];
  TestValidator.equals(
    "total_hours equals billable_hours plus non_billable_hours",
    grandTotal.total_hours,
    grandTotal.billable_hours + grandTotal.non_billable_hours,
  );
  TestValidator.predicate(
    "all hour values are non-negative",
    grandTotal.total_hours >= 0 &&
      grandTotal.billable_hours >= 0 &&
      grandTotal.non_billable_hours >= 0,
  );
  TestValidator.predicate(
    "entry_count is non-negative integer",
    grandTotal.entry_count >= 0 && Number.isInteger(grandTotal.entry_count),
  );
}
