import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_orders_items_index(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a new seller via the join endpoint
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Apply the access token to subsequent calls
  sellerConnection.headers = {
    ...(sellerConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Scenario 1: Retrieve a paginated list of all order items with empty filter
  const responseAll =
    await api.functional.shoppingMall.seller.dashboard.orders.items.index(
      sellerConnection,
      { body: {} },
    );
  const page = typia.assert<IPageIShoppingMallOrderItem.ISummary>(responseAll);
  // Validate pagination meta info
  TestValidator.predicate(
    "pagination current page is at least 0",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  // Validate each order item in page (only assert type, no property checks due to empty ISummary schema)
  for (const item of page.data) {
    typia.assert(item);
  }
  // Scenario 2: Attempt to retrieve filtered order items by status
  // Filtering is impossible due to empty IRequest, so simulate by empty body
  const responseFiltered =
    await api.functional.shoppingMall.seller.dashboard.orders.items.index(
      sellerConnection,
      { body: {} },
    );
  const pageFiltered =
    typia.assert<IPageIShoppingMallOrderItem.ISummary>(responseFiltered);
  TestValidator.predicate(
    "filtered pagination current page is at least 0",
    pageFiltered.pagination.current >= 0,
  );
  TestValidator.predicate(
    "filtered pagination limit is non-negative",
    pageFiltered.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered pagination records is non-negative",
    pageFiltered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages is non-negative",
    pageFiltered.pagination.pages >= 0,
  );
  for (const item of pageFiltered.data) {
    typia.assert(item);
  }
  // Scenario 3: Edge case - Query with non-existent order ID or product variant ID
  // No filter fields exist, simulate by empty body
  const responseEdge =
    await api.functional.shoppingMall.seller.dashboard.orders.items.index(
      sellerConnection,
      { body: {} },
    );
  const pageEdge =
    typia.assert<IPageIShoppingMallOrderItem.ISummary>(responseEdge);
  TestValidator.predicate(
    "edge case pagination current page is at least 0",
    pageEdge.pagination.current >= 0,
  );
  TestValidator.predicate(
    "edge case pagination limit is non-negative",
    pageEdge.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "edge case pagination records is non-negative",
    pageEdge.pagination.records >= 0,
  );
  TestValidator.predicate(
    "edge case pagination pages is non-negative",
    pageEdge.pagination.pages >= 0,
  );
  for (const item of pageEdge.data) {
    typia.assert(item);
  }
}
