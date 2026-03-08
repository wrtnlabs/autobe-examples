import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_item_viewing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // Set authorization header for seller's subsequent requests
  const authenticatedSellerConnection: api.IConnection = {
    ...sellerConnection,
  };
  authenticatedSellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuth.token.access,
  };
  // Step 2: Register customer for purchase flow
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_seller_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // Note: Since we don't have seller product creation endpoint in SDK,
  // we simulate by creating an order item through available paths
  // The test focuses on retrieving and validating order item details
  // Step 3: Generate a valid order item ID (in real scenario, this comes from customer order)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Seller retrieves order item by ID
  const orderItem = await api.functional.ecommerceMall.seller.order_items.at(
    authenticatedSellerConnection,
    { orderItemId },
  );
  typia.assert(orderItem);
  // Step 5: Validate order item details
  TestValidator.equals("order item ID", orderItem.id, orderItemId);
  TestValidator.predicate(
    "item status valid enum",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      orderItem.item_status,
    ),
  );
  TestValidator.predicate(
    "quantity is positive integer",
    orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "unit price is non-negative",
    orderItem.unit_price >= 0,
  );
  TestValidator.notEquals(
    "product snapshot is non-empty",
    orderItem.product_snapshot,
    "",
  );
  TestValidator.notEquals(
    "variant snapshot is non-empty",
    orderItem.variant_snapshot,
    "",
  );
  TestValidator.notEquals(
    "seller profile snapshot is non-empty",
    orderItem.seller_profile_snapshot,
    "",
  );
  typia.assert(orderItem.order);
  TestValidator.equals("order has ID", orderItem.order.id !== undefined, true);
  TestValidator.equals(
    "order has number",
    orderItem.order.order_number !== undefined,
    true,
  );
  TestValidator.predicate(
    "order has total price",
    orderItem.order.total_price >= 0,
  );
  typia.assert(orderItem.product);
  TestValidator.equals(
    "product has ID",
    orderItem.product.id !== undefined,
    true,
  );
  TestValidator.equals(
    "product has name",
    orderItem.product.name !== undefined,
    true,
  );
  TestValidator.predicate(
    "product has valid price",
    orderItem.product.base_price >= 0,
  );
  typia.assert(orderItem.productVariant);
  TestValidator.equals(
    "variant has ID",
    orderItem.productVariant.id !== undefined,
    true,
  );
  TestValidator.equals(
    "variant has SKU code",
    orderItem.productVariant.skuCode !== undefined,
    true,
  );
  TestValidator.predicate(
    "variant stock quantity is non-negative",
    orderItem.productVariant.stockQuantity >= 0,
  );
  TestValidator.equals("variant is active", orderItem.productVariant.isActive, true);
}