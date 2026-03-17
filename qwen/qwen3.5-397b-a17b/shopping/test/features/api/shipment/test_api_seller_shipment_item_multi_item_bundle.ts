import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test the business scenario where a seller bundles multiple order items from the same seller into one shipment and retrieves each item to verify they share the same tracking information.
 *
 * Setup Requirements:
 * 1. Seller account created and authenticated
 * 2. Seller creates a product with multiple variants (e.g., different colors or sizes)
 * 3. Customer account created and authenticated
 * 4. Customer adds multiple variants to cart and places a single order
 * 5. Order contains multiple order items (one per variant) all from the same seller
 * 6. Seller creates ONE shipment containing ALL order items (bundled shipment)
 * 7. Shipment includes tracking carrier and tracking number
 *
 * Test Execution:
 * 1. Seller retrieves first order item from the shipment using GET /seller/shipments/{shipmentId}/items/{itemId1}
 * 2. Seller retrieves second order item from the same shipment using GET /seller/shipments/{shipmentId}/items/{itemId2}
 * 3. Verify both responses return 200 status with valid IShoppingMallShipmentItem
 * 4. Validate both items have identical shipment.tracking_carrier values
 * 5. Validate both items have identical shipment.tracking_number values
 * 6. Validate both items have identical shipment.shipped_at timestamps
 * 7. Validate each orderItem retains its unique quantity, unit_price, and product variant details
 * 8. Validate both items show status='SHIPPED'
 *
 * Business Logic Validation:
 * - Multiple order items from same seller can be bundled into one shipment (Section 199, 459)
 * - All items in the same shipment share identical tracking information (Section 199, 201)
 * - Each order item maintains its individual product/variant snapshot and pricing
 * - Seller can access any item within their shipment independently
 * - Bundled shipment approach reduces shipping costs and simplifies tracking for customer
 */
export async function test_api_seller_shipment_item_multi_item_bundle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Setup - Register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller creates product with multiple variants
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create first variant (e.g., Red color)
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-RED`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: "Red",
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 4. Create second variant (e.g., Blue color)
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-BLUE`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: "Blue",
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 5. Customer Setup - Register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 6. Customer adds first variant to cart
  const cartItem1 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // 7. Customer adds second variant to cart
  const cartItem2 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 8. Customer places order (this creates multiple order items)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerLoginConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 9. Verify order has multiple items from the same seller
  TestValidator.predicate(
    "order has at least 2 items",
    () => order.items.length >= 2,
  );
  // Get the order item IDs for the shipment
  const orderItemIds = order.items.map((item) => item.id);
  // 10. Seller creates ONE shipment bundling ALL order items together
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: "FedEx",
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 11. Seller retrieves first order item from the shipment
  const shipmentItem1 =
    await api.functional.shoppingMall.seller.shipments.items.at(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        itemId: order.items[0].id,
      },
    );
  typia.assert(shipmentItem1);
  // 12. Seller retrieves second order item from the same shipment
  const shipmentItem2 =
    await api.functional.shoppingMall.seller.shipments.items.at(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        itemId: order.items[1].id,
      },
    );
  typia.assert(shipmentItem2);
  // 13. Validate both items have identical shipment tracking information
  TestValidator.equals(
    "tracking carrier matches",
    shipmentItem1.shipment.tracking_carrier,
    shipmentItem2.shipment.tracking_carrier,
  );
  TestValidator.equals(
    "tracking number matches",
    shipmentItem1.shipment.tracking_number,
    shipmentItem2.shipment.tracking_number,
  );
  TestValidator.equals(
    "shipped_at timestamp matches",
    shipmentItem1.shipment.shipped_at,
    shipmentItem2.shipment.shipped_at,
  );
  // 14. Validate each order item maintains unique details
  TestValidator.notEquals(
    "order items have different IDs",
    shipmentItem1.orderItem.id,
    shipmentItem2.orderItem.id,
  );
  TestValidator.notEquals(
    "order items have different variants",
    shipmentItem1.orderItem.productVariantSnapshot.sku_code,
    shipmentItem2.orderItem.productVariantSnapshot.sku_code,
  );
  // 15. Validate both items show status='SHIPPED'
  TestValidator.equals(
    "first item status is SHIPPED",
    shipmentItem1.orderItem.status,
    "SHIPPED",
  );
  TestValidator.equals(
    "second item status is SHIPPED",
    shipmentItem2.orderItem.status,
    "SHIPPED",
  );
  // 16. Validate shipment tracking info is not null
  TestValidator.predicate(
    "tracking carrier is set",
    () => shipmentItem1.shipment.tracking_carrier !== null,
  );
  TestValidator.predicate(
    "tracking number is set",
    () => shipmentItem1.shipment.tracking_number !== null,
  );
  TestValidator.predicate(
    "shipped_at is set",
    () => shipmentItem1.shipment.shipped_at !== null,
  );
}
