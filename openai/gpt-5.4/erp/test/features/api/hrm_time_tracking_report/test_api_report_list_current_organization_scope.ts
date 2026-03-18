import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_list_current_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const reportViewerConnection: api.IConnection = {
    host: connection.host,
  };
  const request = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingReport.IRequest;
  const firstPage = await api.functional.hrmTimeTracking.reports.index(
    reportViewerConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageIHrmTimeTrackingReport.ISummary>(firstPage);
  TestValidator.equals(
    "current page echoes request",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "limit echoes request",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed requested limit",
    firstPage.data.length <= request.limit,
  );
  TestValidator.predicate(
    "reported pages can cover record count",
    firstPage.pagination.pages === 0 ||
      firstPage.pagination.pages * firstPage.pagination.limit >=
        firstPage.pagination.records,
  );
  for (const summary of firstPage.data) {
    typia.assert<IHrmTimeTrackingReport.ISummary>(summary);
  }
  const secondPage = await api.functional.hrmTimeTracking.reports.index(
    reportViewerConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageIHrmTimeTrackingReport.ISummary>(secondPage);
  TestValidator.equals(
    "repeat read uses same page number",
    secondPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "repeat read uses same limit",
    secondPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "repeat read remains bounded by limit",
    secondPage.data.length <= request.limit,
  );
}
