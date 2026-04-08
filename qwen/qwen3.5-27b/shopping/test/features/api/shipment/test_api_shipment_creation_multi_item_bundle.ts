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
 * Test the business workflow where a seller bundles multiple order items from the same order into a single shipment package.
 *
 * Validates the complete multi-item shipment creation flow including seller authentication, customer order placement with multiple items from the same seller, and shipment bundling. Ensures that the shipment is created successfully with all specified order items and that carrier tracking information is properly recorded.
 *
 * Special attention is given to verifying that:
 * - All order items belong to the same seller
 * - The shipment is created with correct carrier information
 * - The shipment references the correct order and seller
 * - The shipment timestamps are properly set
 * - The shipment is not yet delivered upon creation
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Customer registers and authenticates to the platform.
 * 3. Customer places an order containing multiple items from the same seller.
 * 4. Seller creates a shipment bundling all order items with carrier tracking.
 * 5. Validates shipment creation and carrier information.
 */
export async function test_api_shipment_creation_multi_item_bundle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Customer places order with multiple items from same seller
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Filter order items that belong to the authenticated seller
  const sellerItems = order.items.filter(
    (item) => item.seller.id === sellerAuth.id,
  );
  // Ensure we have at least one item from this seller
  TestValidator.predicate(
    "order contains items from seller",
    sellerItems.length > 0,
  );
  // 4. Seller creates shipment bundling multiple order items
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          order_item_ids: sellerItems.map((item) => item.id),
          carrier_name: "UPS",
          tracking_number: "9876543210",
        },
      },
    );
  typia.assert(shipment);
  // 5. Validate shipment creation
  TestValidator.equals(
    "shipment belongs to correct order",
    shipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "shipment belongs to correct seller",
    shipment.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "carrier name matches input",
    shipment.carrier_name,
    "UPS",
  );
  TestValidator.equals(
    "tracking number matches input",
    shipment.tracking_number,
    "9876543210",
  );
  TestValidator.predicate(
    "shipment has creation timestamp",
    shipment.created_at !== null,
  );
  TestValidator.predicate(
    "shipment has update timestamp",
    shipment.updated_at !== null,
  );
  TestValidator.predicate(
    "shipment not yet delivered",
    shipment.delivered_at === null,
  );
  // 6. Validate that multiple items were bundled
  TestValidator.equals(
    "multiple items were bundled in shipment",
    sellerItems.length,
    sellerItems.length,
  );
  TestValidator.predicate("at least 2 items bundled", sellerItems.length >= 2);
}
