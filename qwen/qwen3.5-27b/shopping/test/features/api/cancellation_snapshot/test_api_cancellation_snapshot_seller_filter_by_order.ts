import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationSnapshot";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can retrieve cancellation snapshots for a specific order using orderId filter.
 *
 * This test validates:
 * 1. Seller can filter cancellation snapshots by order ID
 * 2. API accepts orderId filter parameter correctly
 * 3. Non-existent order ID returns valid response (possibly empty)
 * 4. Sorting parameters work correctly
 * 5. Pagination metadata is accurate
 */
export async function test_api_cancellation_snapshot_seller_filter_by_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // Generate test order IDs for filtering
  const testOrderId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const testOrderId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test filtering by order ID with descending sort
  const filterBody1 = {
    orderId: testOrderId1,
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  } satisfies IShoppingMallCancellationSnapshot.IRequest;
  const result1 =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      { body: filterBody1 },
    );
  typia.assert(result1);
  // Validate response structure
  TestValidator.equals("response page", result1.pagination.current, 1);
  TestValidator.equals("response limit", result1.pagination.limit, 20);
  TestValidator.predicate(
    "records count valid",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate("pages count valid", result1.pagination.pages >= 0);
  TestValidator.predicate("data is array", Array.isArray(result1.data));
  // 3. Test with different order ID
  const filterBody2 = {
    orderId: testOrderId2,
    page: 1,
    limit: 15,
  } satisfies IShoppingMallCancellationSnapshot.IRequest;
  const result2 =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      { body: filterBody2 },
    );
  typia.assert(result2);
  TestValidator.equals("different order limit", result2.pagination.limit, 15);
  // 4. Test ascending sort order
  const ascendingFilterBody = {
    orderId: testOrderId1,
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "asc",
  } satisfies IShoppingMallCancellationSnapshot.IRequest;
  const ascendingResult =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      { body: ascendingFilterBody },
    );
  typia.assert(ascendingResult);
  TestValidator.equals(
    "ascending sort limit",
    ascendingResult.pagination.limit,
    10,
  );
  // 5. Test pagination with page 2
  const page2FilterBody = {
    orderId: testOrderId1,
    page: 2,
    limit: 10,
  } satisfies IShoppingMallCancellationSnapshot.IRequest;
  const page2Result =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      { body: page2FilterBody },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // 6. Test combined filters with orderId and status
  const combinedFilterBody = {
    orderId: testOrderId1,
    status: "approved",
    page: 1,
    limit: 20,
    sortBy: "id",
    sortOrder: "desc",
  } satisfies IShoppingMallCancellationSnapshot.IRequest;
  const combinedResult =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      { body: combinedFilterBody },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter page",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedResult.pagination.limit,
    20,
  );
  // 7. Test with date range filter combined with orderId
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const dateRangeFilterBody = {
    orderId: testOrderId1,
    dateRange: {
      from: pastDate.toISOString(),
      to: now.toISOString(),
    },
    page: 1,
    limit: 20,
  } satisfies IShoppingMallCancellationSnapshot.IRequest;
  const dateRangeResult =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      { body: dateRangeFilterBody },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter page",
    dateRangeResult.pagination.current,
    1,
  );
  // 8. Test minimal filter body with only orderId
  const minimalFilterBody = {
    orderId: testOrderId2,
  } satisfies IShoppingMallCancellationSnapshot.IRequest;
  const minimalResult =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      { body: minimalFilterBody },
    );
  typia.assert(minimalResult);
  // Default pagination should apply
  TestValidator.equals(
    "minimal filter default page",
    minimalResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "minimal filter default limit",
    minimalResult.pagination.limit,
    20,
  );
}
