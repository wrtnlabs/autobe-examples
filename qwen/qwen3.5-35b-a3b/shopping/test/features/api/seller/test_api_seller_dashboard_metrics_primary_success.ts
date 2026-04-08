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

export async function test_api_seller_dashboard_metrics_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Verify seller is approved
  TestValidator.equals(
    "seller approval status is approved",
    sellerAuth.approval_status,
    "approved",
  );
  // 3. Create seller connection from auth response
  const sellerApiConnection: api.IConnection = { host: connection.host };
  if (sellerAuth.token) {
    sellerApiConnection.headers = {
      ...sellerApiConnection.headers,
      Authorization: `Bearer ${sellerAuth.token.access}`,
    };
  }
  // 4. Retrieve dashboard metrics with default parameters
  const defaultMetricsResponse =
    await api.functional.ecommerceMall.seller.dashboard_metrics.index(
      sellerApiConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallSellerDashboardMetric.IRequest,
      },
    );
  typia.assert(defaultMetricsResponse);
  // 5. Verify response structure
  typia.assert(defaultMetricsResponse.pagination);
  typia.assert(defaultMetricsResponse.data);
  // 6. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    defaultMetricsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    defaultMetricsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultMetricsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultMetricsResponse.pagination.pages >= 0,
  );
  // 7. Verify at least one metric record exists
  TestValidator.predicate(
    "metrics data array has records",
    defaultMetricsResponse.data.length > 0,
  );
  // 8. Verify first metric record structure
  const firstMetric = defaultMetricsResponse.data[0];
  typia.assert(firstMetric);
  // 9. Verify seller object in metric
  typia.assert(firstMetric.seller);
  TestValidator.equals(
    "seller id exists",
    firstMetric.seller.id !== undefined,
    true,
  );
  TestValidator.equals(
    "seller display_name exists",
    firstMetric.seller.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "seller approval_status is approved",
    firstMetric.seller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller is_suspended is false",
    firstMetric.seller.is_suspended,
    false,
  );
  // 10. Verify metric counts are non-negative
  TestValidator.predicate(
    "product_count is non-negative",
    firstMetric.product_count >= 0,
  );
  TestValidator.predicate(
    "order_item_count is non-negative",
    firstMetric.order_item_count >= 0,
  );
  TestValidator.predicate(
    "pending_cancellation_count is non-negative",
    firstMetric.pending_cancellation_count >= 0,
  );
  TestValidator.predicate(
    "pending_refund_count is non-negative",
    firstMetric.pending_refund_count >= 0,
  );
  // 11. Verify timestamps are valid ISO 8601 format
  const createdAt = firstMetric.created_at;
  const updatedAt = firstMetric.updated_at;
  const deletedAt = firstMetric.deleted_at;
  typia.assert(createdAt);
  typia.assert(updatedAt);
  typia.assert(deletedAt);
  TestValidator.equals(
    "created_at is valid ISO format",
    createdAt !== null,
    true,
  );
  TestValidator.equals(
    "updated_at is valid ISO format",
    updatedAt !== null,
    true,
  );
  TestValidator.equals("deleted_at is null for active record", deletedAt, null);
  // 12. Verify sorting functionality
  const sortedMetricsResponse =
    await api.functional.ecommerceMall.seller.dashboard_metrics.index(
      sellerApiConnection,
      {
        body: {
          sortBy: "product_count",
          sortOrder: "desc",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallSellerDashboardMetric.IRequest,
      },
    );
  typia.assert(sortedMetricsResponse);
  // 13. Verify metrics are sorted by product_count descending
  if (sortedMetricsResponse.data.length > 1) {
    for (let i = 1; i < sortedMetricsResponse.data.length; i++) {
      const prevMetric = sortedMetricsResponse.data[i - 1];
      const currMetric = sortedMetricsResponse.data[i];
      TestValidator.predicate(
        `metric ${i} product_count <= metric ${i - 1} product_count`,
        currMetric.product_count <= prevMetric.product_count,
      );
    }
  }
}