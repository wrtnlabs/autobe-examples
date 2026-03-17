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
 * Test the primary success path where a seller successfully creates a shipment
 * for a single order item after a customer places an order.
 */
export async function test_api_shipment_single_item_fulfillment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - authenticate via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Seller creates a product
  // Note: categoryId must reference an existing category in the database
  // Using a valid category ID format - in real tests this would be fetched from existing categories
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          basePrice: typia.random<number>(),
        },
      },
    );
  typia.assert(product);
  // 3. Seller creates a product variant (SKU)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: {
            color: RandomGenerator.pick(["Red", "Blue", "Green"]),
          },
        },
      },
    );
  typia.assert(variant);
  // 4. Customer setup - authenticate via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 5. Customer creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        stateProvince: RandomGenerator.name(1),
        postalCode: RandomGenerator.alphaNumeric(6),
        country: "United States",
      },
    },
  );
  typia.assert(address);
  // 6. Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // Verify order has items in 'paid' status
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  TestValidator.equals(
    "order item shipment is null before shipping",
    orderItem.shipment,
    null,
  );
  // 7. Seller creates shipment for the order item
  const carrierName = RandomGenerator.pick(["FedEx", "UPS", "DHL"]);
  const trackingNumber = `TRK-${RandomGenerator.alphaNumeric(12)}`;
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName,
          trackingNumber,
          orderId: order.id,
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 8. Validate shipment properties
  TestValidator.equals(
    "carrier name matches",
    shipment.carrierName,
    carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    shipment.trackingNumber,
    trackingNumber,
  );
  TestValidator.equals(
    "seller matches authenticated seller",
    shipment.seller.id,
    seller.id,
  );
  TestValidator.equals("order matches", shipment.order.id, order.id);
  TestValidator.predicate(
    "shippedAt timestamp is set",
    shipment.shippedAt !== null,
  );
  TestValidator.equals(
    "deliveredAt is null for in-transit shipment",
    shipment.deliveredAt,
    null,
  );
  TestValidator.predicate(
    "shipment contains order items",
    shipment.orderItems.length > 0,
  );
  // 9. Validate order item status changed to 'shipped'
  const shippedItem = shipment.orderItems[0];
  TestValidator.equals(
    "order item status changed to shipped",
    shippedItem.status,
    "shipped",
  );
}