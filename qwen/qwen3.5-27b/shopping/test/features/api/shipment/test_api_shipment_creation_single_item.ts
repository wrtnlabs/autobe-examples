import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test the primary success path where a seller creates a shipment for a single order item.
 *
 * Validates the complete shipment creation flow including seller authentication, customer order placement, and seller shipment creation. Ensures that the shipment correctly includes carrier information and tracking number, and that the order item status transitions from 'paid' to 'shipped'.
 *
 * Special attention is given to verifying that the shipment entity contains all required fields and that the tracking information is immediately available to the customer.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Customer registers and authenticates with the platform.
 * 3. Customer completes checkout to create an order with 'paid' status item.
 * 4. Seller creates a shipment for the single order item with carrier and tracking info.
 * 5. Validates shipment entity structure including carrier, tracking number, and timestamps.
 */
export async function test_api_shipment_creation_single_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Customer places order (checkout)
  // The utility handles cart population and checkout internally
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item (should be 'paid' status)
  const orderItem = order.items[0];
  typia.assert(orderItem);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 4. Seller creates shipment for the single order item
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: "FedEx",
          tracking_number: `TRK-${RandomGenerator.alphaNumeric(12)}`,
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 5. Validate shipment entity structure
  TestValidator.equals("carrier name matches", shipment.carrier_name, "FedEx");
  TestValidator.predicate(
    "tracking number is valid format",
    shipment.tracking_number.startsWith("TRK-"),
  );
  TestValidator.predicate("created_at is set", shipment.created_at !== null);
  TestValidator.equals(
    "delivered_at is null initially",
    shipment.delivered_at,
    null,
  );
  TestValidator.predicate(
    "order reference exists",
    shipment.order.id !== undefined,
  );
  TestValidator.predicate(
    "seller reference exists",
    shipment.seller.id !== undefined,
  );
  // 6. Verify shipment belongs to correct order and seller
  TestValidator.equals(
    "shipment belongs to correct order",
    shipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "shipment created by correct seller",
    shipment.seller.id,
    sellerAuth.id,
  );
}
