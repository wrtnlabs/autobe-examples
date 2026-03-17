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
 * Test that a seller can successfully retrieve detailed tracking information for a shipment they created.
 *
 * **Setup:**
 * 1. Customer registers account and logs in
 * 2. Seller registers account and logs in
 * 3. Seller creates a product with a category
 * 4. Seller creates a variant for the product
 * 5. Customer adds the variant to cart
 * 6. Customer creates an order from the cart
 * 7. Seller creates a shipment for the order items with tracking information (carrier: 'FedEx', tracking number: '123456789')
 *
 * **Test Steps:**
 * 1. Seller calls GET /shoppingMall/seller/shipments/{shipmentId} with the created shipment ID
 * 2. Verify response returns complete shipment details
 * 3. Validate tracking_carrier equals 'FedEx'
 * 4. Validate tracking_number equals '123456789'
 * 5. Validate shipped_at timestamp is set (not null)
 * 6. Validate items array contains all order items that were included in the shipment
 * 7. Validate each item has correct product variant information, quantity, and status='SHIPPED'
 * 8. Validate order summary is included with correct order number
 * 9. Validate delivered_at, delivery_confirmed_at are null (not yet delivered)
 *
 * **Expected Result:** Seller successfully retrieves complete shipment tracking information with all order items, confirming the shipment creation and tracking data persistence.
 */
export async function test_api_seller_shipment_retrieve_own_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuthorized.email,
      password: customerAuthorized.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 2. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuthorized.email,
      password: sellerAuthorized.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: randint(1000, 1000000),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price: randint(1000, 1000000),
          stock_quantity: randint(10, 100),
          options: ArrayUtil.repeat(2, (index) => ({
            key: index === 0 ? "color" : "size",
            value:
              index === 0
                ? RandomGenerator.pick(["Red", "Blue", "Green"])
                : RandomGenerator.pick(["Small", "Medium", "Large"]),
          })),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: randint(1, 5),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Customer creates order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // 7. Seller creates shipment with tracking information
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: order.items.map((item) => item.id),
        tracking_carrier: "FedEx",
        tracking_number: "123456789",
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 8. Seller retrieves shipment details
  const retrievedShipment =
    await api.functional.shoppingMall.seller.shipments.at(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedShipment);
  // 9. Validate shipment details
  TestValidator.equals(
    "tracking carrier",
    retrievedShipment.tracking_carrier,
    "FedEx",
  );
  TestValidator.equals(
    "tracking number",
    retrievedShipment.tracking_number,
    "123456789",
  );
  TestValidator.predicate(
    "shipped_at is set",
    retrievedShipment.shipped_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is null",
    retrievedShipment.delivered_at === null,
  );
  TestValidator.predicate(
    "delivery_confirmed_at is null",
    retrievedShipment.delivery_confirmed_at === null,
  );
  TestValidator.predicate("has items", retrievedShipment.items.length > 0);
  TestValidator.equals("order ID", retrievedShipment.order.id, order.id);
  TestValidator.predicate(
    "all items status is SHIPPED",
    retrievedShipment.items.every((item) => item.status === "SHIPPED"),
  );
}
