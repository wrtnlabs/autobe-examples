import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_retrieval_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication via join utility
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // customerConnection.headers now contains Authorization from authorize function
  // Use this authenticated connection for subsequent API calls
  // 2. Generate UUIDs for order and item identifiers
  // In real scenario, these would come from created order/product APIs
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve first order item (simulating Seller A's product)
  // Note: In production, this would retrieve actual order items from real orders
  const orderItem1 =
    await api.functional.ecommerceMall.customer.orders.items.at(
      customerConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(orderItem1);
  // 4. Retrieve second order item (simulating Seller B's product)
  const orderItem2 =
    await api.functional.ecommerceMall.customer.orders.items.at(
      customerConnection,
      {
        orderId,
        itemId: itemId2,
      },
    );
  typia.assert(orderItem2);
  // 5. Validate both items reference same order (multi-seller order structure)
  TestValidator.equals(
    "order item 1 and 2 reference same order ID",
    orderItem1.order.id,
    orderItem2.order.id,
  );
  // 6. Validate order summary contains required fields
  TestValidator.equals(
    "order has valid order number",
    orderItem1.order.order_number,
    orderItem1.order.order_number,
  );
  TestValidator.equals(
    "order has valid total price",
    orderItem1.order.total_price > 0,
    true,
  );
  TestValidator.equals(
    "order has valid overall status",
    orderItem1.order.overall_status,
    orderItem1.order.overall_status,
  );
  // 7. Validate item status tracking per item (can differ between items in same order)
  TestValidator.predicate(
    "item 1 has valid item status",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partiallyCompleted",
    ].includes(orderItem1.item_status),
  );
  TestValidator.predicate(
    "item 2 has valid item status",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partiallyCompleted",
    ].includes(orderItem2.item_status),
  );
  // 8. Validate snapshot fields are present (immutable purchase-time data)
  TestValidator.equals(
    "item 1 has product snapshot",
    orderItem1.product_snapshot !== null &&
      orderItem1.product_snapshot !== undefined,
    true,
  );
  TestValidator.equals(
    "item 1 has variant snapshot",
    orderItem1.variant_snapshot !== null &&
      orderItem1.variant_snapshot !== undefined,
    true,
  );
  TestValidator.equals(
    "item 1 has seller profile snapshot",
    orderItem1.seller_profile_snapshot !== null &&
      orderItem1.seller_profile_snapshot !== undefined,
    true,
  );
  // 9. Validate nested product summary has seller attribution
  TestValidator.equals(
    "product has seller reference",
    orderItem1.product.seller.id !== null &&
      orderItem1.product.seller.id !== undefined,
    true,
  );
  // 10. Validate nested product summary has category reference
  TestValidator.equals(
    "product has category reference",
    orderItem1.product.category.id !== null &&
      orderItem1.product.category.id !== undefined,
    true,
  );
  // 11. Validate nested variant summary
  TestValidator.equals(
    "variant has valid sku code",
    orderItem1.variant.skuCode !== null &&
      orderItem1.variant.skuCode !== undefined,
    true,
  );
  // 12. Validate quantity and pricing data
  TestValidator.predicate(
    "item 1 has positive quantity",
    orderItem1.quantity > 0,
  );
  TestValidator.predicate(
    "item 2 has positive quantity",
    orderItem2.quantity > 0,
  );
  TestValidator.predicate(
    "item 1 has positive unit price",
    orderItem1.unit_price > 0,
  );
  TestValidator.predicate(
    "item 2 has positive unit price",
    orderItem2.unit_price > 0,
  );
  // 13. Validate timestamps are present
  TestValidator.equals(
    "item 1 has created_at timestamp",
    orderItem1.created_at !== null && orderItem1.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "item 1 has updated_at timestamp",
    orderItem1.updated_at !== null && orderItem1.updated_at !== undefined,
    true,
  );
  // 14. Validate customer reference in order summary
  TestValidator.equals(
    "order has customer reference",
    orderItem1.order.customer.id !== null &&
      orderItem1.order.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "customer has display name",
    orderItem1.order.customer.display_name !== null &&
      orderItem1.order.customer.display_name !== undefined,
    true,
  );
}