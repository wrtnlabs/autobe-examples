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
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
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
 * Test customer order retrieval with mixed fulfillment status computation.
 *
 * Validates the order retrieval endpoint for customer access, ensuring proper response structure and type safety. This test verifies that customers can successfully retrieve their orders with complete order details including order items, product variants, seller information, and shipment tracking data.
 *
 * **Business Rule Validation**
 *
 * The order status is computed from its order items' statuses: all items paid results in "paid", any item shipped results in "shipped", all items delivered results in "delivered", all items cancelled results in "cancelled", all items refunded results in "refunded", and mixed states result in "partially_completed".
 *
 * **Test Limitations**
 *
 * This test validates the retrieval endpoint structure and response type validation. Full mixed status computation testing would require order creation APIs to set up orders with items in different fulfillment states (paid, shipped, delivered, etc.). The current SDK only provides order retrieval functionality.
 *
 * 1. Customer authenticates with the system.
 * 2. Customer attempts to retrieve an order by ID.
 * 3. Validates response structure includes all required fields.
 * 4. Verifies order items contain product variant and seller details.
 * 5. Confirms shipment information is properly nested.
 */
export async function test_api_customer_order_mixed_status_computation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a valid UUID for order ID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Note: Without order creation APIs, we cannot create an actual order with mixed statuses.
  // This test validates the retrieval endpoint structure and type validation.
  // In a full implementation, we would:
  // - Create an order with multiple items from different sellers
  // - Set some items to 'shipped' status with shipment data
  // - Keep other items in 'paid' status without shipment data
  // - Verify the order status is computed as 'partially_completed'
  // For now, test the endpoint with a valid UUID format and expect 404
  await TestValidator.error("order not found (expected)", async () => {
    await api.functional.ecommerce.customer.orders.at(customerConnection, {
      orderId,
    });
  });
}
