import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test customer viewing a shipment that has been delivered, verifying delivery
 * status and timestamp display.
 *
 * **Business Context:**
 * Per requirement [530] and [1075], customers confirm delivery per shipment.
 * When confirmed, the deliveredAt timestamp is recorded and all items in the
 * shipment change to 'delivered' status.
 *
 * **Test Flow:**
 * 1. Create customer and seller accounts
 * 2. Seller creates product with variant
 * 3. Customer creates shipping address and completes checkout
 * 4. Seller creates shipment for order items
 * 5. Customer confirms delivery
 * 6. Retrieve and verify delivered shipment details
 */
export async function test_api_shipment_delivered_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com/checkout",
      referrer: "https://test.example.com/cart",
    },
  });
  // 2. Create authenticated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(2),
      href: "https://test.example.com/seller",
      referrer: "https://test.example.com",
    },
  });
  // 3. Seller creates product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: { color: "Black", size: "M" },
          price: product.base_price + 1000,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer creates shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: "123 Test Street",
        city: "Seoul",
        stateProvince: "Seoul",
        postalCode: "12345",
        country: "South Korea",
      },
    },
  );
  typia.assert(address);
  // 6. Customer completes checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 7. Get order items belonging to this seller
  const orderItemIds = order.orderItems
    .filter((item) => item.seller.id === product.seller.id)
    .map((item) => item.id);
  // 8. Seller creates shipment for order items
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "FedEx",
          trackingNumber: `FX${RandomGenerator.alphaNumeric(12)}`,
          orderId: order.id,
          orderItemIds: orderItemIds,
        },
      },
    );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Retrieve the delivered shipment details
  const deliveredShipment =
    await api.functional.shoppingMall.customer.orders.shipments.at(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  // 11. Validate delivered status and timestamp
  TestValidator.predicate(
    "deliveredAt should be set after delivery confirmation",
    deliveredShipment.deliveredAt !== null,
  );
  TestValidator.predicate(
    "all order items should have delivered status",
    deliveredShipment.orderItems.every((item) => item.status === "delivered"),
  );
  TestValidator.equals(
    "carrier name should remain accessible",
    deliveredShipment.carrierName,
    "FedEx",
  );
  TestValidator.predicate(
    "tracking number should remain accessible",
    deliveredShipment.trackingNumber.startsWith("FX"),
  );
  TestValidator.equals(
    "shipment ID should match",
    deliveredShipment.id,
    shipment.id,
  );
}
