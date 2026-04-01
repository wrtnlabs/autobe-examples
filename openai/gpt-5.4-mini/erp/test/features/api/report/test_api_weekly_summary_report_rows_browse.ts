import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeWeeklySummaryReportRow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeWeeklySummaryReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_rows_browse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = `${RandomGenerator.alphaNumeric(12)}A!`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: undefined,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const response =
    await api.functional.erpHrmTime.member.reports.weekly_summary_report_rows.index(
      memberConnection,
      {
        body: {
          dateFrom: "2026-01-05T00:00:00.000Z",
          dateTo: "2026-01-25T23:59:59.999Z",
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeWeeklySummaryReportRow.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within limit",
    response.data.length <= response.pagination.limit,
  );
  TestValidator.predicate(
    "data length within records",
    response.data.length <= response.pagination.records,
  );
  for (const row of response.data) {
    typia.assert(row);
    TestValidator.predicate(
      "week starts on or before week end",
      new Date(row.weekStartDate).getTime() <=
        new Date(row.weekEndDate).getTime(),
    );
    TestValidator.predicate(
      "week start is Monday",
      new Date(row.weekStartDate).getUTCDay() === 1,
    );
    TestValidator.predicate(
      "week end is Sunday",
      new Date(row.weekEndDate).getUTCDay() === 0,
    );
    TestValidator.predicate("total hours is non-negative", row.totalHours >= 0);
    TestValidator.predicate(
      "timelog count is non-negative",
      row.timelogCount >= 0,
    );
    TestValidator.predicate(
      "active employee count is non-negative",
      row.activeEmployeeCount >= 0,
    );
    TestValidator.predicate(
      "row belongs to the current organization summary",
      row.organization !== null,
    );
  }
}
