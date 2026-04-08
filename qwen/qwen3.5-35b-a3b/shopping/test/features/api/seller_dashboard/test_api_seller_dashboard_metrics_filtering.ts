import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerDashboardMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_metrics_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Verify seller is approved and not suspended
  TestValidator.equals(
    "seller approval status approved",
    sellerAuth.approval_status,
    "approved",
  );
  TestValidator.equals("seller not suspended", sellerAuth.is_suspended, false);
  // 3. Create seller-specific connection with auth token
  const sellerApiConnection: api.IConnection = { host: connection.host };
  sellerApiConnection.headers = { Authorization: sellerAuth.token.access };
  // 4. Test date range filtering with createdAt
  const startDateGte = "2025-01-15T00:00:00Z";
  const endDateLt = "2025-03-01T00:00:00Z";
  const dateRangeMetrics =
    await api.functional.ecommerceMall.seller.dashboard_metrics.index(
      sellerApiConnection,
      {
        body: {
          createdAtGte: startDateGte,
          createdAtLt: endDateLt,
        } satisfies IEcommerceMallSellerDashboardMetric.IRequest,
      },
    );
  typia.assert(dateRangeMetrics);
  // 5. Verify date range results match criteria
  for (const metric of dateRangeMetrics.data) {
    const metricCreatedAt = new Date(metric.created_at);
    const startDate = new Date(startDateGte);
    const endDate = new Date(endDateLt);
    TestValidator.predicate(
      "metric created_at within range",
      metricCreatedAt >= startDate && metricCreatedAt < endDate,
    );
  }
  // 6. Test metric value threshold filtering
  const thresholdMetrics =
    await api.functional.ecommerceMall.seller.dashboard_metrics.index(
      sellerApiConnection,
      {
        body: {
          productCountGte: 40,
          orderItemCountGte: 150,
        } satisfies IEcommerceMallSellerDashboardMetric.IRequest,
      },
    );
  typia.assert(thresholdMetrics);
  // 7. Verify threshold results meet both criteria
  for (const metric of thresholdMetrics.data) {
    TestValidator.predicate(
      "product_count meets threshold",
      metric.product_count >= 40,
    );
    TestValidator.predicate(
      "order_item_count meets threshold",
      metric.order_item_count >= 150,
    );
  }
  // 8. Test combined filtering
  const combinedMetrics =
    await api.functional.ecommerceMall.seller.dashboard_metrics.index(
      sellerApiConnection,
      {
        body: {
          createdAtGte: "2025-01-01T00:00:00Z",
          productCountGte: 60,
        } satisfies IEcommerceMallSellerDashboardMetric.IRequest,
      },
    );
  typia.assert(combinedMetrics);
  // 9. Verify combined filtering results
  for (const metric of combinedMetrics.data) {
    const metricCreatedAt = new Date(metric.created_at);
    const startDate = new Date("2025-01-01T00:00:00Z");
    TestValidator.predicate(
      "combined: created_at within range",
      metricCreatedAt >= startDate,
    );
    TestValidator.predicate(
      "combined: product_count meets threshold",
      metric.product_count >= 60,
    );
  }
  // 10. Test updatedAt filtering
  const updatedStartGte = "2025-02-15T00:00:00Z";
  const updatedEndLt = "2025-04-01T00:00:00Z";
  const updatedAtMetrics =
    await api.functional.ecommerceMall.seller.dashboard_metrics.index(
      sellerApiConnection,
      {
        body: {
          updatedAtGte: updatedStartGte,
          updatedAtLt: updatedEndLt,
        } satisfies IEcommerceMallSellerDashboardMetric.IRequest,
      },
    );
  typia.assert(updatedAtMetrics);
  // 11. Verify updatedAt results match criteria
  for (const metric of updatedAtMetrics.data) {
    const metricUpdatedAt = new Date(metric.updated_at);
    const startDate = new Date(updatedStartGte);
    const endDate = new Date(updatedEndLt);
    TestValidator.predicate(
      "metric updated_at within range",
      metricUpdatedAt >= startDate && metricUpdatedAt < endDate,
    );
  }
  // 12. Test pagination with sorting
  const paginatedMetrics =
    await api.functional.ecommerceMall.seller.dashboard_metrics.index(
      sellerApiConnection,
      {
        body: {
          limit: 1,
          sortBy: "product_count",
          sortOrder: "desc",
        } satisfies IEcommerceMallSellerDashboardMetric.IRequest,
      },
    );
  typia.assert(paginatedMetrics);
  // 13. Verify pagination results
  TestValidator.equals(
    "pagination limit applied",
    paginatedMetrics.data.length,
    1,
  );
  TestValidator.equals(
    "pagination pages calculation",
    paginatedMetrics.pagination.pages,
    paginatedMetrics.pagination.records === 0
      ? 0
      : Math.ceil(
          paginatedMetrics.pagination.records /
            paginatedMetrics.pagination.limit,
        ),
  );
  // 14. Test empty result scenario
  const emptyMetrics =
    await api.functional.ecommerceMall.seller.dashboard_metrics.index(
      sellerApiConnection,
      {
        body: {
          productCountGte: 1000,
        } satisfies IEcommerceMallSellerDashboardMetric.IRequest,
      },
    );
  typia.assert(emptyMetrics);
  // 15. Verify empty results structure
  TestValidator.equals("empty results array", emptyMetrics.data.length, 0);
  TestValidator.equals(
    "empty records count",
    emptyMetrics.pagination.records,
    0,
  );
  TestValidator.equals("empty pages count", emptyMetrics.pagination.pages, 0);
  // 16. Verify all returned metrics belong to authenticated seller
  for (const metric of [
    ...dateRangeMetrics.data,
    ...thresholdMetrics.data,
    ...combinedMetrics.data,
    ...updatedAtMetrics.data,
    ...paginatedMetrics.data,
    ...emptyMetrics.data,
  ]) {
    TestValidator.equals(
      "metric seller_id matches authenticated seller",
      metric.seller.id,
      sellerAuth.id,
    );
  }
}