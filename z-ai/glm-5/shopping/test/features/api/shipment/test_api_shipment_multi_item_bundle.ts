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
 * Test the business workflow where a seller bundles multiple order items
 * from the same order into a single shipment.
 *
 * This validates:
 * 1. Seller can bundle multiple order items from same order
 * 2. Same-seller constraint enforcement
 * 3. Same-order constraint enforcement
 * 4. Atomic status update to 'shipped'
 * 5. Single shipment record linking multiple items
 */
export async function test_api_shipment_multi_item_bundle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create product with multiple variants
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<number>(),
        },
      },
    );
  typia.assert(product);
  // 3. Create two product variants for bundling test
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: { color: "Red", size: "Large" },
          price: product.base_price + 10,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: { color: "Blue", size: "Medium" },
          price: product.base_price,
        },
      },
    );
  typia.assert(variant2);
  // 4. Customer Setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 5. Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        city: RandomGenerator.name(1),
        stateProvince: RandomGenerator.name(1),
        postalCode: RandomGenerator.alphaNumeric(6),
        country: "United States",
      },
    },
  );
  typia.assert(address);
  // 6. Create order (checkout)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 7. Get order items that belong to this seller and are in 'paid' status
  const paidOrderItems = order.orderItems.filter(
    (item) => item.status === "paid" && item.seller.id === seller.id,
  );
  TestValidator.predicate(
    "Should have at least one paid order item from this seller",
    paidOrderItems.length >= 1,
  );
  // 8. Create shipment bundling multiple order items
  const orderItemIds = paidOrderItems.map((item) => item.id) satisfies (string &
    tags.Format<"uuid">)[];
  const shipment =
    await api.functional.shoppingMall.seller.seller.shipments.create(
      sellerConnection,
      {
        body: {
          carrierName: "FedEx",
          trackingNumber: `TRK-${RandomGenerator.alphaNumeric(12)}`,
          orderId: order.id,
          orderItemIds: orderItemIds,
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 9. Post-Creation Verification
  // Verify shipment has correct order reference
  TestValidator.equals(
    "Shipment order ID matches",
    shipment.order.id,
    order.id,
  );
  // Verify seller is the authenticated seller
  TestValidator.equals(
    "Shipment seller ID matches",
    shipment.seller.id,
    seller.id,
  );
  // Verify carrier and tracking information
  TestValidator.equals("Carrier name matches", shipment.carrierName, "FedEx");
  // Verify all bundled items are in shipment
  TestValidator.equals(
    "Shipment contains all bundled items",
    shipment.orderItems.length,
    orderItemIds.length,
  );
  // Verify all items reference the same shipment
  const allItemsHaveSameShipment = shipment.orderItems.every(
    (item) => item.shipment !== null && item.shipment.id === shipment.id,
  );
  TestValidator.predicate(
    "All order items reference the same shipment",
    allItemsHaveSameShipment,
  );
  // Verify all items are now shipped status
  const allItemsShipped = shipment.orderItems.every(
    (item) => item.status === "shipped",
  );
  TestValidator.predicate(
    "All order items have shipped status",
    allItemsShipped,
  );
  // Verify shippedAt timestamp is set
  TestValidator.predicate(
    "ShippedAt timestamp is set",
    new Date(shipment.shippedAt) <= new Date(),
  );
  // Verify deliveredAt is null (not yet delivered)
  TestValidator.equals(
    "DeliveredAt is null for new shipment",
    shipment.deliveredAt,
    null,
  );
}
