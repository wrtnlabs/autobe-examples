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
 * Validates the time report endpoint response structure and business invariants.
 *
 * Tests the GET /erpHrm/member/reports/time endpoint to verify the aggregated
 * time report conforms to IErpHrmTimeReport schema. Authenticates as a member
 * and retrieves the report, then validates structural correctness including
 * discriminator values, hour breakdown consistency (total = billable + non-billable),
 * and the "Unassigned" synthetic entry for timelogs without task assignments.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Retrieves the time report through the reports endpoint.
 * 3. typia.assert validates the full discriminated union response schema.
 * 4. Iterates all entries to verify total_hours equals billable_hours plus non_billable_hours.
 * 5. For task-grouped entries with null taskId, confirms title is "Unassigned".
 * 6. Confirms entry_count is non-negative across all entries.
 */
export async function test_api_time_report_grouped_by_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Retrieve time report
  const report =
    await api.functional.erpHrm.member.reports.time.report(memberConnection);
  typia.assert(report);
  // 3. Validate business invariants across all entries
  for (const entry of report.data) {
    TestValidator.equals(
      "total = billable + non-billable",
      entry.total_hours,
      entry.billable_hours + entry.non_billable_hours,
    );
    TestValidator.predicate("entry_count non-negative", entry.entry_count >= 0);
    // 4. Task-grouped specific: validate Unassigned entry
    if (entry.group_by === "task" && entry.taskId === null) {
      TestValidator.equals("unassigned task title", entry.title, "Unassigned");
    }
  }
}
