import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_admin_overview_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Define date range for filtering - 2 days ago to now
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const startDate = twoDaysAgo.toISOString();
  const endDate = now.toISOString();
  // 3. Call the available API endpoint with date range filter
  // Only IShoppingMallOrder.IRequest and api.functional.shoppingMall.seller.orders.index are available
  const result = await api.functional.shoppingMall.seller.orders.index(
    sellerConnection,
    {
      body: {
        created_at_start: startDate,
        created_at_end: endDate,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  // 4. Validate the response structure
  typia.assert(result);
  // 5. Validate the response has pagination and data fields
  TestValidator.predicate(
    "has pagination",
    () => result.pagination !== undefined,
  );
  TestValidator.predicate("has data array", () => Array.isArray(result.data));
  // 6. Validate all returned orders are within the date range
  result.data.forEach((order) => {
    const orderDate = new Date(order.created_at);
    const isWithinRange = orderDate >= twoDaysAgo && orderDate <= now;
    TestValidator.predicate("order within date range", () => isWithinRange);
  });
  // 7. Verify the limit parameter worked - don't exceed 100 results
  TestValidator.predicate("limit respected", () => result.data.length <= 100);
  // 8. Verify created_at_start and created_at_end are respected in filtered data
  // Sort to verify boundaries
  const sortedByDate = [...result.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  if (sortedByDate.length > 0) {
    const earliestOrderDate = new Date(sortedByDate[0].created_at);
    const latestOrderDate = new Date(
      sortedByDate[sortedByDate.length - 1].created_at,
    );
    TestValidator.predicate(
      "earliest order not before start",
      () => earliestOrderDate >= twoDaysAgo,
    );
    TestValidator.predicate(
      "latest order not after end",
      () => latestOrderDate <= now,
    );
  }
}
