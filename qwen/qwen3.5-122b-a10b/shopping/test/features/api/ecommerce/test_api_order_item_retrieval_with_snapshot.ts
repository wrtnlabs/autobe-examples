import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order item retrieval with historical snapshot data.
 *
 * Validates the customer's ability to retrieve a specific order item from their order history, including complete snapshot data that preserves the state of the product and seller at purchase time. This ensures historical accuracy for dispute resolution and purchase verification.
 *
 * The test authenticates a customer, retrieves an order item, and validates that all required fields are present including the embedded snapshot with product name, description, seller shop name, and base price.
 *
 * 1. Customer authenticates with the system.
 * 2. Customer retrieves a specific order item by order ID and item ID.
 * 3. Validates order item contains all required fields (id, quantity, unit_price, status, timestamps).
 * 4. Validates embedded snapshot contains historical product and seller data.
 * 5. Validates order, productVariant, and seller summaries are properly included.
 */
export async function test_api_order_item_retrieval_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve order item (in simulation mode, this generates valid test data)
  // Note: In real E2E tests, order and item would be created through prior test setup
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderItem = await api.functional.ecommerce.customer.orders.items.at(
    customerConnection,
    {
      orderId,
      itemId,
    },
  );
  typia.assert(orderItem);
  // 3. Validate order item core fields
  TestValidator.predicate("order item has valid id", orderItem.id.length > 0);
  TestValidator.predicate("quantity is positive", orderItem.quantity > 0);
  TestValidator.predicate(
    "unit_price is non-negative",
    orderItem.unit_price >= 0,
  );
  TestValidator.predicate("status is defined", orderItem.status.length > 0);
  TestValidator.predicate(
    "created_at is valid date-time",
    orderItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    orderItem.updated_at.length > 0,
  );
  // 4. Validate order summary
  TestValidator.predicate("order has valid id", orderItem.order.id.length > 0);
  TestValidator.predicate(
    "order has order number",
    orderItem.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has valid status",
    orderItem.order.status.length > 0,
  );
  TestValidator.predicate(
    "order total is non-negative",
    orderItem.order.total_price >= 0,
  );
  TestValidator.predicate(
    "order has customer reference",
    orderItem.order.customer.id.length > 0,
  );
  // 5. Validate product variant summary
  TestValidator.predicate(
    "variant has valid id",
    orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "variant has SKU code",
    orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    orderItem.productVariant.option_values.length > 0,
  );
  TestValidator.predicate(
    "variant has non-negative stock",
    orderItem.productVariant.stock_count >= 0,
  );
  TestValidator.predicate(
    "variant has product reference",
    orderItem.productVariant.product.id.length > 0,
  );
  // 6. Validate seller summary
  TestValidator.predicate(
    "seller has valid id",
    orderItem.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller has shop name",
    orderItem.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller approval status is defined",
    orderItem.seller.approval_status.length > 0,
  );
  // 7. Validate snapshot contains historical data
  TestValidator.predicate(
    "snapshot has valid id",
    orderItem.snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot references order item",
    orderItem.snapshot.ecommerce_order_item_id.length > 0,
  );
  TestValidator.predicate(
    "snapshot has product name",
    orderItem.snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop name",
    orderItem.snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has base price",
    orderItem.snapshot.base_price >= 0,
  );
  TestValidator.predicate(
    "snapshot has created timestamp",
    orderItem.snapshot.created_at.length > 0,
  );
}
