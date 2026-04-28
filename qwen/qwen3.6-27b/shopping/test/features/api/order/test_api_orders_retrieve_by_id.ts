import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";

/**
 * Test order retrieval by unique identifier for authenticated customer.
 *
 * Validates the complete order retrieval flow following customer registration and order placement. Authenticates a customer account, creates a test order, and retrieves the full order details using the order's UUID. Ensures that the retrieved order contains all expected nested data structures including customer profile, shipping address, and order line items with product variant references.
 *
 * Business rules are tested to confirm that the retrieved order belongs to the authenticated customer and that all nested relationships are properly resolved. The shipping address captured at checkout is verified to be immutable and correctly preserved. Order items are validated to contain quantities, locked unit prices, and product variant summaries.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Customer creates an order with random items and shipping address.
 * 3. Customer retrieves the order by its UUID identifier.
 * 4. Validates that the order belongs to the authenticated customer.
 * 5. Validates shipping address and order items with product variant data.
 */
export async function test_api_orders_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorized);
  const customerId = authorized.id;
  // 2. Create an order as the authenticated customer
  const createdOrder =
    await generate_random_ecommerce_platform_customer_orders_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(createdOrder);
  // 3. Retrieve the order by its UUID
  const retrievedOrder =
    await api.functional.ecommercePlatform.customer.orders.at(
      customerConnection,
      { orderId: createdOrder.id },
    );
  typia.assert(retrievedOrder);
  // 4. Validate order belongs to the authenticated customer
  TestValidator.equals(
    "retrieved order belongs to authenticated customer",
    retrievedOrder.customerProfile.customer.id,
    customerId,
  );
  // 5. Validate shipping address exists with all required fields
  TestValidator.predicate(
    "shipping address has recipient name",
    retrievedOrder.shippingAddress.recipient_name.length > 0,
  );
  TestValidator.equals(
    "shipping address ID matches created order",
    retrievedOrder.shippingAddress.id,
    createdOrder.shippingAddress.id,
  );
  // 6. Validate order items contain product variants
  TestValidator.predicate(
    "order has at least one item",
    retrievedOrder.items.length >= 1,
  );
  for (const item of retrievedOrder.items) {
    TestValidator.predicate(
      "order item quantity is positive",
      item.quantity >= 1,
    );
    TestValidator.predicate(
      "order item price is non-negative",
      item.price >= 0,
    );
    TestValidator.predicate(
      "order item has product variant with SKU",
      item.productVariant.sku_code.length > 0,
    );
  }
}
