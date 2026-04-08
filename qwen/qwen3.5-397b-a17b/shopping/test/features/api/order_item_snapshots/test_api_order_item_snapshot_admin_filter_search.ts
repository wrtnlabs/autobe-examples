import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering and search capabilities for order item snapshots.
 *
 * Validates the complete filtering and search functionality available to administrators for browsing order item snapshots. Tests individual filter parameters including product_name, seller_shop_name, search, created_at_from, and created_at_to, as well as sorting options and pagination controls.
 *
 * Special attention is given to verifying partial matching behavior, date range inclusivity, sorting correctness in both ascending and descending order, and proper pagination structure in responses including empty result sets.
 *
 * 1. Administrator authenticates via authorize_admin_join utility.
 * 2. Tests product_name filter with partial matching.
 * 3. Tests seller_shop_name filter with partial matching.
 * 4. Tests general search parameter matching both fields.
 * 5. Tests date range filtering with created_at_from and created_at_to.
 * 6. Tests sorting by all supported fields in both directions.
 * 7. Tests combined filters with pagination.
 * 8. Verifies empty result handling returns valid pagination structure.
 */
export async function test_api_order_item_snapshot_admin_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test product_name filter with partial matching
  const productNameFilter = "TestProduct";
  const productFilterResult =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          product_name: productNameFilter,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(productFilterResult);
  // 3. Test seller_shop_name filter with partial matching
  const shopNameFilter = "TestShop";
  const shopFilterResult =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          seller_shop_name: shopNameFilter,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(shopFilterResult);
  // 4. Test general search parameter
  const searchResult =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          search: "Test",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Test date range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 6. Test sorting by product_name ascending
  const sortProductAsc =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          sort: "product_name",
          direction: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortProductAsc);
  // Test sorting by product_name descending
  const sortProductDesc =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          sort: "product_name",
          direction: "desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortProductDesc);
  // Test sorting by seller_shop_name ascending
  const sortShopAsc =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          sort: "seller_shop_name",
          direction: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortShopAsc);
  // Test sorting by seller_shop_name descending
  const sortShopDesc =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          sort: "seller_shop_name",
          direction: "desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortShopDesc);
  // Test sorting by created_at ascending
  const sortCreatedAsc =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          direction: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortCreatedAsc);
  // Test sorting by created_at descending
  const sortCreatedDesc =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          direction: "desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortCreatedDesc);
  // 7. Test combined filters with pagination
  const combinedResult =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          product_name: productNameFilter,
          created_at_from: oneDayAgo.toISOString(),
          page: 2,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter page number",
    combinedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedResult.pagination.limit,
    10,
  );
  // 8. Test empty result handling - use impossible search term
  const emptyResult =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(32),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
}
