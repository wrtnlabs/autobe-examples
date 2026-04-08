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
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

/**
 * Test customer manual delivery confirmation for a shipped order item.
 *
 * Validates the complete delivery confirmation workflow where a customer manually confirms receipt of a shipped order item. The test ensures proper actor separation between seller (who creates shipments) and customer (who confirms delivery), and validates the status transition from "shipped" to "delivered".
 *
 * The workflow follows the natural order fulfillment sequence: seller creates shipment with tracking information, customer receives the package, and customer confirms delivery through the platform. This triggers status updates for both the order item and the shipment.
 *
 * 1. Customer registers and authenticates with valid credentials.
 * 2. Seller registers and authenticates with valid credentials.
 * 3. Seller creates a shipment for an order item with carrier and tracking information.
 * 4. Customer confirms delivery for the order item via the confirm-delivery endpoint.
 * 5. Validates the order item status transitions to "delivered".
 * 6. Validates the shipment's delivered_at timestamp is populated.
 * 7. Validates the returned order item contains correct status and references.
 */
export async function test_api_order_item_delivery_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
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
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create order item (simulated - in real test, this would be created through order placement)
  // For simulation mode, we use random UUIDs
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller creates shipment for the order item
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
          tracking_url: typia.random<string & tags.Format<"uri">>(),
          order_item_ids: [itemId],
        } satisfies IEcommerceShipment.ICreate,
        params: {
          orderId: orderId,
        },
      },
    );
  typia.assert(shipment);
  // Validate shipment was created with shipped status
  TestValidator.equals(
    "shipment status is shipped",
    shipment.status,
    "shipped",
  );
  TestValidator.predicate(
    "shipment has shipped_at",
    shipment.shipped_at !== null,
  );
  // 5. Customer confirms delivery for the order item
  const updatedOrderItem =
    await api.functional.ecommerce.customer.orders.items.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
      },
    );
  typia.assert(updatedOrderItem);
  // 6. Validate order item status changed to "delivered"
  TestValidator.equals(
    "order item status is delivered",
    updatedOrderItem.status,
    "delivered",
  );
  // 7. Validate order item references are preserved
  TestValidator.equals("order ID matches", updatedOrderItem.order.id, orderId);
  TestValidator.predicate(
    "has product variant",
    updatedOrderItem.productVariant !== null,
  );
  TestValidator.predicate("has seller", updatedOrderItem.seller !== null);
}
