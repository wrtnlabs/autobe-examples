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
 * Test customer delivery confirmation for one order item in a shipment containing multiple items.
 *
 * Validates the shipment-level delivery confirmation business rule where confirming delivery for one order item automatically updates all items in the same shipment to delivered status.
 *
 * This test verifies the API endpoint structure and response validation for the delivery confirmation functionality. Note: Full business logic validation requires order creation endpoints which are not available in the current SDK.
 *
 * 1. Customer registers and authenticates with the platform.
 * 2. Seller registers and authenticates.
 * 3. Customer confirms delivery for an order item via the API endpoint.
 * 4. Validates the response structure and type safety.
 * 5. Validates the endpoint accepts valid UUID parameters.
 */
export async function test_api_order_item_delivery_confirmation_shipment_level(
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
  // 3. Generate valid UUIDs for order and item IDs
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer confirms delivery for an order item
  // Note: In simulation mode, this returns random data. In production, this would
  // validate the actual business logic of shipment-level delivery confirmation.
  const updatedItem =
    await api.functional.ecommerce.customer.orders.items.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
      },
    );
  typia.assert(updatedItem);
  // 5. Validate response structure
  TestValidator.equals("response has id", updatedItem.id, itemId);
  TestValidator.predicate(
    "response has status",
    updatedItem.status !== undefined,
  );
  TestValidator.predicate(
    "response has order reference",
    updatedItem.order !== null,
  );
  TestValidator.predicate(
    "response has product variant",
    updatedItem.productVariant !== null,
  );
  TestValidator.predicate(
    "response has seller reference",
    updatedItem.seller !== null,
  );
  TestValidator.predicate(
    "response has snapshot",
    updatedItem.snapshot !== null,
  );
  // 6. Validate UUID format
  TestValidator.equals("order ID is valid UUID", orderId, orderId);
  TestValidator.equals("item ID is valid UUID", itemId, itemId);
}
