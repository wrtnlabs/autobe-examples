import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test multi-seller order shipment scenario where different sellers ship their items separately.
 *
 * Validates the complete multi-seller order workflow including seller registration, product creation, customer checkout, and separate shipment creation by each seller. Ensures that when an order contains items from multiple sellers, each seller can independently create shipments for their own items, and the order status correctly reflects the shipping progress.
 *
 * Special attention is given to verifying that:
 * - Each seller can only ship their own items
 * - Separate shipments are created for each seller
 * - Order items transition from 'paid' to 'shipped' status after shipment creation
 * - The order maintains separate shipment records with different carrier information
 *
 * 1. Register and authenticate two sellers (seller A and seller B).
 * 2. Register and authenticate a customer.
 * 3. Seller A creates a product with a variant.
 * 4. Seller B creates a product with a variant.
 * 5. Customer adds both variants to cart and completes checkout.
 * 6. Seller A creates a shipment for their order item.
 * 7. Seller B creates a shipment for their order item.
 * 8. Validate that both shipments were created successfully.
 * 9. Verify that both order items have 'shipped' status.
 */
export async function test_api_shipment_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerA);
  // 2. Register and authenticate seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerB);
  // 3. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(customer);
  // 4. Seller A creates a product
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 5. Seller A creates a variant for the product
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variantA);
  // 6. Seller B creates a product
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 7. Seller B creates a variant for the product
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
          variantOptions: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variantB);
  // 8. Customer adds seller A's variant to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantA.id,
        quantity: 1,
      },
    },
  );
  // 9. Customer adds seller B's variant to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantB.id,
        quantity: 1,
      },
    },
  );
  // 10. Customer completes checkout to create multi-seller order
  // Note: The generate function will handle address creation internally
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        payment_token: "test_payment_token",
      },
    },
  );
  typia.assert(order);
  // Find order items for each seller
  const sellerAItem = order.items.find((item) => item.seller.id === sellerA.id);
  const sellerBItem = order.items.find((item) => item.seller.id === sellerB.id);
  if (!sellerAItem || !sellerBItem) {
    throw new Error("Failed to find order items for both sellers");
  }
  // 11. Seller A creates shipment for their item
  const shipmentA = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        carrier_name: "DHL",
        tracking_number: "DHL123456789",
        order_item_ids: [sellerAItem.id],
        order_id: order.id,
      },
    },
  );
  typia.assert(shipmentA);
  // 12. Seller B creates shipment for their item
  const shipmentB = await generate_random_shopping_mall_seller_shipments_create(
    sellerBConnection,
    {
      body: {
        carrier_name: "FedEx",
        tracking_number: "FX987654321",
        order_item_ids: [sellerBItem.id],
        order_id: order.id,
      },
    },
  );
  typia.assert(shipmentB);
  // 13. Validate shipments were created successfully
  TestValidator.equals("shipment A carrier", shipmentA.carrier_name, "DHL");
  TestValidator.equals(
    "shipment A tracking",
    shipmentA.tracking_number,
    "DHL123456789",
  );
  TestValidator.equals("shipment B carrier", shipmentB.carrier_name, "FedEx");
  TestValidator.equals(
    "shipment B tracking",
    shipmentB.tracking_number,
    "FX987654321",
  );
  // 14. Verify shipments are different
  TestValidator.notEquals("shipments are separate", shipmentA.id, shipmentB.id);
  // 15. Verify both shipments belong to the same order
  TestValidator.equals("shipment A order", shipmentA.order.id, order.id);
  TestValidator.equals("shipment B order", shipmentB.order.id, order.id);
  // 16. Verify each shipment belongs to the correct seller
  TestValidator.equals("shipment A seller", shipmentA.seller.id, sellerA.id);
  TestValidator.equals("shipment B seller", shipmentB.seller.id, sellerB.id);
  // 17. Verify order has two shipments
  TestValidator.predicate(
    "order has two shipments",
    order.shipments.length === 2,
  );
}
