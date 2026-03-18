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

export async function test_api_weekly_summary_report_retrieval_for_manager(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingManager.IAuthorized =
    await authorize_manager_join(managerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const now: Date = new Date();
  const rangeEnd: Date = new Date(now.getTime());
  const rangeStart: Date = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 28);
  const page: number = 1;
  const limit: number = 10;
  const request = {
    report_type: "weekly_summary",
    group_by: "week",
    range_start_date: rangeStart.toISOString(),
    range_end_date: rangeEnd.toISOString(),
    page,
    limit,
    sort: "week_asc",
  } satisfies IHrmTimeTrackingReport.IRequest;
  const first: IPageIHrmTimeTrackingReport.ISummary =
    await api.functional.hrmTimeTracking.manager.reports.weeklySummaries.index(
      managerConnection,
      {
        body: request,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "pagination current matches request",
    first.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    first.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within requested limit",
    first.data.length <= limit,
  );
  for (const row of first.data) {
    TestValidator.predicate(
      "report_type is not empty",
      row.report_type.length > 0,
    );
    TestValidator.predicate(
      "group_by is week-compatible",
      row.group_by === null || row.group_by === "week",
    );
    if (row.range_start_date !== null) {
      TestValidator.predicate(
        "row range_start_date is within requested lower bound",
        new Date(row.range_start_date).getTime() >= rangeStart.getTime(),
      );
      TestValidator.predicate(
        "row range_start_date is within requested upper bound",
        new Date(row.range_start_date).getTime() <= rangeEnd.getTime(),
      );
    }
    if (row.range_end_date !== null) {
      TestValidator.predicate(
        "row range_end_date is within requested lower bound",
        new Date(row.range_end_date).getTime() >= rangeStart.getTime(),
      );
      TestValidator.predicate(
        "row range_end_date is within requested upper bound",
        new Date(row.range_end_date).getTime() <= rangeEnd.getTime(),
      );
    }
    if (row.range_start_date !== null && row.range_end_date !== null) {
      TestValidator.predicate(
        "row range start is not after row range end",
        new Date(row.range_start_date).getTime() <=
          new Date(row.range_end_date).getTime(),
      );
    }
  }
  const second: IPageIHrmTimeTrackingReport.ISummary =
    await api.functional.hrmTimeTracking.manager.reports.weeklySummaries.index(
      managerConnection,
      {
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "repeated request item count is stable",
    second.data.length,
    first.data.length,
  );
  TestValidator.equals(
    "repeated request pagination is stable",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "repeated request data is stable",
    second.data,
    first.data,
  );
}
