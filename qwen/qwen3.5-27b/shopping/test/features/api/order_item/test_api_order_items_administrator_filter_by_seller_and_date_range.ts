import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator filtering of order items by seller ID and creation date range.
 * Validates that administrators can effectively filter order items using seller ID and date range parameters.
 * Tests individual filters (seller_id, date range), combined filters, and edge cases with empty result sets.
 * Ensures pagination metadata is accurate for all filtered queries.
 *
 * The test verifies that the filtering logic correctly applies AND conditions when multiple filters are provided,
 * and that all returned order items include complete reference data (seller, order, product variant).
 *
 * 1. Authenticate as administrator with random credentials
 * 2. Filter order items by seller_id only
 * 3. Verify all returned items belong to the specified seller
 * 4. Filter order items by date range (created_at_from, created_at_to)
 * 5. Verify all returned items have creation dates within the range
 * 6. Filter with combined seller_id and date range
 * 7. Verify results satisfy both filter criteria
 * 8. Test with non-existent seller ID (expect empty results)
 * 9. Test with date range that has no items (expect empty results)
 */
export async function test_api_order_items_administrator_filter_by_seller_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // Get all order items first to have reference data
  const allItemsResponse =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(allItemsResponse);
  // If there are no order items in the system, test with empty result handling
  if (allItemsResponse.data.length === 0) {
    // Test empty result set with random seller_id
    const emptyResponse =
      await api.functional.shoppingMall.administrator.order_items.index(
        adminConnection,
        {
          body: {
            seller_id: "00000000-0000-0000-0000-000000000001",
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(emptyResponse);
    TestValidator.equals("empty result count", emptyResponse.data.length, 0);
    TestValidator.equals(
      "empty pagination records",
      emptyResponse.pagination.records,
      0,
    );
    return;
  }
  // 2. Filter by seller_id only
  const sampleSellerId = allItemsResponse.data[0].seller.id;
  const sellerFilteredResponse =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          seller_id: sampleSellerId,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerFilteredResponse);
  // Verify all items belong to the specified seller
  for (const item of sellerFilteredResponse.data) {
    TestValidator.equals(
      `item ${item.id} belongs to seller ${sampleSellerId}`,
      item.seller.id,
      sampleSellerId,
    );
  }
  // 3. Filter by date range only
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredResponse =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          created_at_from: oneMonthAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  // Verify all items are within the date range
  for (const item of dateFilteredResponse.data) {
    const itemCreatedAt = new Date(item.created_at);
    TestValidator.predicate(
      `item ${item.id} created_at >= from`,
      itemCreatedAt >= oneMonthAgo,
    );
    TestValidator.predicate(
      `item ${item.id} created_at <= to`,
      itemCreatedAt <= now,
    );
  }
  // 4. Filter with combined seller_id and date range
  const combinedFilteredResponse =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          seller_id: sampleSellerId,
          created_at_from: oneMonthAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(combinedFilteredResponse);
  // Verify all items satisfy both filters
  for (const item of combinedFilteredResponse.data) {
    TestValidator.equals(
      `item ${item.id} belongs to seller ${sampleSellerId}`,
      item.seller.id,
      sampleSellerId,
    );
    const itemCreatedAt = new Date(item.created_at);
    TestValidator.predicate(
      `item ${item.id} created_at >= from`,
      itemCreatedAt >= oneMonthAgo,
    );
    TestValidator.predicate(
      `item ${item.id} created_at <= to`,
      itemCreatedAt <= now,
    );
  }
  // 5. Test with non-existent seller ID (expect empty results)
  const nonExistentSellerResponse =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          seller_id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(nonExistentSellerResponse);
  TestValidator.equals(
    "non-existent seller returns empty",
    nonExistentSellerResponse.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent seller pagination records",
    nonExistentSellerResponse.pagination.records,
    0,
  );
  // 6. Test with date range that has no items (far future)
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const farFuturePlusOneDay = new Date(
    farFuture.getTime() + 24 * 60 * 60 * 1000,
  );
  const futureDateResponse =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          created_at_from: farFuture.toISOString(),
          created_at_to: farFuturePlusOneDay.toISOString(),
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(futureDateResponse);
  TestValidator.equals(
    "future date range returns empty",
    futureDateResponse.data.length,
    0,
  );
  TestValidator.equals(
    "future date range pagination records",
    futureDateResponse.pagination.records,
    0,
  );
  // 7. Verify pagination metadata is correct
  TestValidator.predicate(
    "seller filter pagination current >= 1",
    sellerFilteredResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "seller filter pagination limit > 0",
    sellerFilteredResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "seller filter data length matches limit or records",
    sellerFilteredResponse.data.length,
    Math.min(
      sellerFilteredResponse.pagination.limit,
      sellerFilteredResponse.pagination.records,
    ),
  );
}
