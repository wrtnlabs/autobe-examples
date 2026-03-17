import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test pagination controls for the order items listing to ensure sellers can
 * navigate large result sets efficiently.
 *
 * Test cases:
 * 1. Basic pagination with page=1 and limit=10
 * 2. Verify pagination metadata accuracy (current, limit, records, pages)
 * 3. Confirm data array respects limit constraint
 * 4. Verify default sorting by created_at descending
 * 5. Test boundary: limit cap at maximum (100)
 * 6. Test boundary: empty data array when page exceeds total pages
 */
export async function test_api_order_items_pagination_controls(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
    },
  });
  // 2. Test basic pagination: page=1, limit=10
  const page1Result =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(page1Result);
  // Verify pagination metadata
  TestValidator.equals(
    "current page should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "records should be non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    page1Result.pagination.pages >= 0,
  );
  // Verify data array size constraint
  TestValidator.predicate(
    "data array should not exceed limit",
    page1Result.data.length <= 10,
  );
  // Verify total pages calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    page1Result.pagination.records / page1Result.pagination.limit,
  );
  TestValidator.equals(
    "total pages should be ceil(records / limit)",
    page1Result.pagination.pages,
    expectedPages,
  );
  // 3. Test default sorting by created_at descending
  if (page1Result.data.length >= 2) {
    const dates = page1Result.data.map((item) =>
      new Date(item.created_at).getTime(),
    );
    const isDescending = dates.every(
      (date, index) => index === 0 || dates[index - 1] >= date,
    );
    TestValidator.predicate(
      "items should be sorted by created_at descending (newest first)",
      isDescending,
    );
  }
  // 4. Test boundary: limit cap at maximum (100)
  const maxLimitResult =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          limit: 150, // Exceeds maximum of 100
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  // Verify limit is capped at 100
  TestValidator.predicate(
    "limit should be capped at maximum 100",
    maxLimitResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "data array should not exceed 100 items",
    maxLimitResult.data.length <= 100,
  );
  // 5. Test boundary: page number exceeds available pages
  if (page1Result.pagination.pages > 0) {
    const excessivePageResult =
      await api.functional.shoppingMall.seller.order_items.index(
        sellerConnection,
        {
          body: {
            page: page1Result.pagination.pages + 100, // Way beyond available pages
            limit: 10,
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(excessivePageResult);
    // Verify empty data array when page exceeds total pages
    TestValidator.equals(
      "data array should be empty when page exceeds total pages",
      excessivePageResult.data.length,
      0,
    );
  }
  // 6. Test different limit values for pagination consistency
  const limit5Result =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          limit: 5,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(limit5Result);
  TestValidator.equals("limit should be 5", limit5Result.pagination.limit, 5);
  TestValidator.predicate(
    "data array should not exceed 5 items",
    limit5Result.data.length <= 5,
  );
  // Verify records count consistency across different pagination requests
  TestValidator.equals(
    "total records should be consistent across pagination requests",
    page1Result.pagination.records,
    limit5Result.pagination.records,
  );
  // 7. Test minimum limit value
  const minLimitResult =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          limit: 1,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals("limit should be 1", minLimitResult.pagination.limit, 1);
  TestValidator.predicate(
    "data array should not exceed 1 item",
    minLimitResult.data.length <= 1,
  );
}
