import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_weekly_summary_report_date_range_recalculation(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager1234!",
      href: "https://example.com/managers/reports/weekly-summaries",
      referrer: "https://example.com/managers",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(authorized);
  const broadStart = new Date("2026-01-01T00:00:00.000Z");
  const broadEnd = new Date("2026-03-31T23:59:59.999Z");
  const narrowStart = new Date("2026-02-01T00:00:00.000Z");
  const narrowEnd = new Date("2026-02-28T23:59:59.999Z");
  const broadRequest = {
    report_type: "weekly_summary",
    range_start_date: broadStart.toISOString(),
    range_end_date: broadEnd.toISOString(),
    page: 1,
    limit: 10,
    sort: "+range_start_date",
  } satisfies IHrmTimeTrackingReport.IRequest;
  const broadPage =
    await api.functional.hrmTimeTracking.manager.reports.weeklySummaries.index(
      managerConnection,
      {
        body: broadRequest,
      },
    );
  typia.assert(broadPage);
  TestValidator.equals(
    "broad page current matches request",
    broadPage.pagination.current,
    broadRequest.page,
  );
  TestValidator.equals(
    "broad page limit matches request",
    broadPage.pagination.limit,
    broadRequest.limit,
  );
  TestValidator.predicate(
    "broad page count is non-negative",
    broadPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "broad record count is non-negative",
    broadPage.pagination.records >= 0,
  );
  for (const row of broadPage.data) {
    if (row.range_start_date !== null) {
      TestValidator.predicate(
        "broad row start stays within broad window",
        new Date(row.range_start_date).getTime() >= broadStart.getTime(),
      );
    }
    if (row.range_end_date !== null) {
      TestValidator.predicate(
        "broad row end stays within broad window",
        new Date(row.range_end_date).getTime() <= broadEnd.getTime(),
      );
    }
  }
  const narrowRequest = {
    report_type: "weekly_summary",
    range_start_date: narrowStart.toISOString(),
    range_end_date: narrowEnd.toISOString(),
    page: 1,
    limit: 5,
    sort: "-range_start_date",
  } satisfies IHrmTimeTrackingReport.IRequest;
  const narrowPage =
    await api.functional.hrmTimeTracking.manager.reports.weeklySummaries.index(
      managerConnection,
      {
        body: narrowRequest,
      },
    );
  typia.assert(narrowPage);
  TestValidator.equals(
    "narrow page current matches request",
    narrowPage.pagination.current,
    narrowRequest.page,
  );
  TestValidator.equals(
    "narrow page limit matches request",
    narrowPage.pagination.limit,
    narrowRequest.limit,
  );
  TestValidator.predicate(
    "narrow page count is non-negative",
    narrowPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "narrow record count is non-negative",
    narrowPage.pagination.records >= 0,
  );
  for (const row of narrowPage.data) {
    if (row.range_start_date !== null) {
      TestValidator.predicate(
        "narrow row start stays within narrow window",
        new Date(row.range_start_date).getTime() >= narrowStart.getTime(),
      );
    }
    if (row.range_end_date !== null) {
      TestValidator.predicate(
        "narrow row end stays within narrow window",
        new Date(row.range_end_date).getTime() <= narrowEnd.getTime(),
      );
    }
  }
  const repeatedNarrowPage =
    await api.functional.hrmTimeTracking.manager.reports.weeklySummaries.index(
      managerConnection,
      {
        body: narrowRequest,
      },
    );
  typia.assert(repeatedNarrowPage);
  TestValidator.equals(
    "repeated narrow pagination is deterministic",
    repeatedNarrowPage.pagination,
    narrowPage.pagination,
  );
  TestValidator.equals(
    "repeated narrow row ids are deterministic",
    repeatedNarrowPage.data.map((row) => row.id),
    narrowPage.data.map((row) => row.id),
  );
}
