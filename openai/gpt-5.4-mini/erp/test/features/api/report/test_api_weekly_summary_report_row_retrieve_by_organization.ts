import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeWeeklySummaryReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_row_retrieve_by_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email:
        `member_${typia.random<string & tags.Format<"uuid">>()}@test.com` satisfies string &
          tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/signup" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const rowId = typia.random<string & tags.Format<"uuid">>();
  const row =
    await api.functional.erpHrmTime.member.reports.weekly_summary_report_rows.at(
      memberConnection,
      { weeklySummaryReportRowId: rowId },
    );
  typia.assert(row);
  TestValidator.predicate("row id is present", row.id.length > 0);
  TestValidator.predicate(
    "organization summary is present",
    row.organization !== null && row.organization !== undefined,
  );
  TestValidator.predicate(
    "week start is present",
    row.weekStartDate.length > 0,
  );
  TestValidator.predicate("week end is present", row.weekEndDate.length > 0);
  TestValidator.predicate("total hours are non-negative", row.totalHours >= 0);
  TestValidator.predicate(
    "timelog count is non-negative",
    row.timelogCount >= 0,
  );
  TestValidator.predicate(
    "active employee count is non-negative",
    row.activeEmployeeCount >= 0,
  );
  TestValidator.predicate(
    "created timestamp is present",
    row.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp is present",
    row.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is nullable or timestamp",
    row.deletedAt === null || typeof row.deletedAt === "string",
  );
  const start = new Date(row.weekStartDate);
  const end = new Date(row.weekEndDate);
  TestValidator.predicate("week start is Monday", start.getUTCDay() === 1);
  TestValidator.predicate("week end is Sunday", end.getUTCDay() === 0);
  TestValidator.predicate(
    "week start is before or equal to week end",
    start.getTime() <= end.getTime(),
  );
  const missingRowId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "missing weekly summary row should not be retrievable",
    async () => {
      await api.functional.erpHrmTime.member.reports.weekly_summary_report_rows.at(
        memberConnection,
        { weeklySummaryReportRowId: missingRowId },
      );
    },
  );
}
