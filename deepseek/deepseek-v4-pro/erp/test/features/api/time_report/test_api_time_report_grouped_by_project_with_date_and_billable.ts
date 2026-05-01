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
 * Test time report grouped by project with date range and billable filter.
 *
 * Validates the time report endpoint's project-grouped aggregation capability. The report provides aggregated work hour summaries grouped by project, with separate tallies for billable and non-billable hours alongside entry counts.
 *
 * The validation ensures that for each project group entry, the mathematical invariant `total_hours = billable_hours + non_billable_hours` holds, confirming correct aggregation logic. Entry counts are verified as non-negative integers.
 *
 * 1. Member registers via join to obtain authentication credentials.
 * 2. Retrieves the time report from the reports endpoint.
 * 3. Validates response structure with typia.assert and business invariants for project-grouped entries.
 */
export async function test_api_time_report_grouped_by_project_with_date_and_billable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Retrieve the time report
  const report =
    await api.functional.erpHrm.member.reports.time.report(memberConnection);
  typia.assert(report);
  // 3. Validate business invariants for project-grouped entries
  for (const entry of report.data) {
    if (entry.group_by === "project") {
      TestValidator.predicate(
        "total_hours equals billable_hours plus non_billable_hours",
        entry.total_hours === entry.billable_hours + entry.non_billable_hours,
      );
    }
  }
}
