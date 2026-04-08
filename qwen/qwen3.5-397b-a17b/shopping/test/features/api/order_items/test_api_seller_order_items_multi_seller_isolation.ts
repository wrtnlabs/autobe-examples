import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test multi-seller order item isolation to ensure sellers can only view their own order items.
 *
 * Validates that when multiple sellers contribute items to a single customer order, each seller can only access their own order items through the seller dashboard endpoint. This ensures proper data isolation and prevents sellers from viewing or processing other sellers' items within the same order.
 *
 * The test creates two seller accounts, authenticates them separately, and queries the order-items endpoint for each seller. It verifies that each seller's response contains only items where the seller.id matches their own account ID, with no cross-seller data leakage.
 *
 * 1. Register and authenticate Seller A with unique credentials.
 * 2. Register and authenticate Seller B with unique credentials.
 * 3. Seller A queries order-items endpoint and receives their items only.
 * 4. Seller B queries order-items endpoint and receives their items only.
 * 5. Validate Seller A's response contains only items with seller.id matching Seller A.
 * 6. Validate Seller B's response contains only items with seller.id matching Seller B.
 * 7. Verify no seller can access the other seller's order items.
 * 8. If both sellers have items from the same order (same orderCode), verify they see different item sets.
 */
export async function test_api_seller_order_items_multi_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Register and authenticate Seller B with different credentials
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Seller A queries order-items endpoint
  const sellerAOrderItems =
    await api.functional.shoppingMall.seller.seller.order_items.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerAOrderItems);
  // 4. Seller B queries order-items endpoint
  const sellerBOrderItems =
    await api.functional.shoppingMall.seller.seller.order_items.index(
      sellerBConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerBOrderItems);
  // 5. Validate Seller A sees only their own items
  TestValidator.predicate("Seller A items belong to Seller A only", () =>
    sellerAOrderItems.data.every((item) => item.seller.id === sellerA.id),
  );
  // 6. Validate Seller B sees only their own items
  TestValidator.predicate("Seller B items belong to Seller B only", () =>
    sellerBOrderItems.data.every((item) => item.seller.id === sellerB.id),
  );
  // 7. Validate no cross-seller data leakage
  TestValidator.predicate(
    "Seller A cannot see Seller B's items",
    () => !sellerAOrderItems.data.some((item) => item.seller.id === sellerB.id),
  );
  TestValidator.predicate(
    "Seller B cannot see Seller A's items",
    () => !sellerBOrderItems.data.some((item) => item.seller.id === sellerA.id),
  );
  // 8. If both sellers have items from the same order, verify different item sets
  if (sellerAOrderItems.data.length > 0 && sellerBOrderItems.data.length > 0) {
    const sellerAOrderCodes = new Set(
      sellerAOrderItems.data.map((item) => item.orderCode),
    );
    const sellerBOrderCodes = new Set(
      sellerBOrderItems.data.map((item) => item.orderCode),
    );
    // Find common order codes (multi-seller orders)
    const commonOrderCodes = [...sellerAOrderCodes].filter((code) =>
      sellerBOrderCodes.has(code),
    );
    if (commonOrderCodes.length > 0) {
      // For multi-seller orders, verify sellers see different items
      for (const orderCode of commonOrderCodes) {
        const sellerAItemsForOrder = sellerAOrderItems.data.filter(
          (item) => item.orderCode === orderCode,
        );
        const sellerBItemsForOrder = sellerBOrderItems.data.filter(
          (item) => item.orderCode === orderCode,
        );
        TestValidator.notEquals(
          `Different items for order ${orderCode}`,
          sellerAItemsForOrder.map((item) => item.id).sort(),
          sellerBItemsForOrder.map((item) => item.id).sort(),
        );
      }
    }
  }
}
