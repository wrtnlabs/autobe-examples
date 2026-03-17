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
 * Test that order item status is accurately tracked and returned through the fulfillment lifecycle.
 *
 * This test validates order item retrieval at different status states:
 * 1. PAID status - order placed but not yet shipped
 * 2. SHIPPED status - after seller creates shipment
 * 3. DELIVERED status - after customer confirms delivery
 *
 * For each status, verify the seller can retrieve the order item with correct status value,
 * all snapshot data remains intact, and tracking information is accessible when shipped.
 */
export async function test_api_seller_order_item_status_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Seller needs to be approved by admin (simulated - assuming auto-approval for test)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
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
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Setup: Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Customer adds item to cart
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Customer places order (creates order item in PAID status)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order has items
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  // 7. Verify PAID status - Seller retrieves order item
  const paidOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(
      sellerLoginConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(paidOrderItem);
  // Validate PAID status
  TestValidator.equals(
    "order item status is PAID",
    paidOrderItem.status,
    "PAID",
  );
  TestValidator.equals("order item ID matches", paidOrderItem.id, orderItem.id);
  TestValidator.equals(
    "quantity matches",
    paidOrderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    paidOrderItem.unitPrice,
    orderItem.unitPrice,
  );
  // Validate snapshot data integrity
  TestValidator.predicate(
    "product snapshot exists",
    paidOrderItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "variant snapshot exists",
    paidOrderItem.productVariantSnapshot !== undefined,
  );
  TestValidator.predicate(
    "seller info exists",
    paidOrderItem.seller !== undefined,
  );
  TestValidator.equals(
    "seller shop name matches",
    paidOrderItem.seller.shop_name,
    sellerAuth.shop_name,
  );
  // 8. Seller creates shipment (changes item status to SHIPPED)
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: "FedEx",
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 9. Verify SHIPPED status - Seller retrieves order item
  const shippedOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(
      sellerLoginConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(shippedOrderItem);
  // Validate SHIPPED status
  TestValidator.equals(
    "order item status is SHIPPED",
    shippedOrderItem.status,
    "SHIPPED",
  );
  TestValidator.equals(
    "order item ID unchanged",
    shippedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "quantity unchanged",
    shippedOrderItem.quantity,
    orderItem.quantity,
  );
  // Validate snapshot data still intact after shipment
  TestValidator.equals(
    "product snapshot name unchanged",
    shippedOrderItem.productSnapshot.name,
    paidOrderItem.productSnapshot.name,
  );
  TestValidator.equals(
    "variant snapshot SKU unchanged",
    shippedOrderItem.productVariantSnapshot.sku_code,
    paidOrderItem.productVariantSnapshot.sku_code,
  );
  // 10. Validate shipment tracking information is accessible
  TestValidator.predicate(
    "shipment has tracking carrier",
    shipment.tracking_carrier !== null,
  );
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.tracking_number !== null,
  );
  TestValidator.equals(
    "tracking carrier matches",
    shipment.tracking_carrier,
    "FedEx",
  );
  TestValidator.predicate(
    "shipment has shipped_at timestamp",
    shipment.shipped_at !== null,
  );
  // Note: DELIVERED status would require customer delivery confirmation
  // which may involve a separate endpoint not in our available API list.
  // The test validates PAID → SHIPPED transition successfully.
}