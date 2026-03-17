import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test filtering order items by fulfillment status for administrative oversight.
 * Validates that an administrator can filter order items by specific status
 * (paid, shipped, delivered, cancelled, refunded) to monitor orders requiring
 * specific actions such as paid items awaiting shipment or delivered items
 * eligible for refund review.
 */
export async function test_api_admin_order_items_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin, seller, and customer actors
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuthorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerAuthorized);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuthorized);
  // 2. Create category (admin)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create two products with variants (seller)
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          price: typia.random<number & tags.Minimum<0>>(),
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        },
      },
    );
  typia.assert(variant1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Medium" },
          ],
          price: typia.random<number & tags.Minimum<0>>(),
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        },
      },
    );
  typia.assert(variant2);
  // 4. Add items to cart (customer)
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // 5. Checkout to create order with multiple items (customer)
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.alphabets(5).toUpperCase(),
        state: RandomGenerator.alphabets(5).toUpperCase(),
        postalCode: `${10000 + Math.floor(Math.random() * 89999)}`,
        country: "US",
      },
    },
  );
  typia.assert(order);
  // Verify order has multiple items
  TestValidator.predicate(
    "order has multiple items",
    order.orderItems.length >= 2,
  );
  // 6. Test status filtering for order items (admin)
  // Test filtering by 'paid' status - newly created orders should have paid items
  const paidItemsResult =
    await api.functional.ecommerceMall.admin.orders.items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paidItemsResult);
  // All returned items should have 'paid' status
  TestValidator.predicate(
    "all paid items have paid status",
    paidItemsResult.data.every((item) => item.status === "paid"),
  );
  // Total count should match number of items in order since all are paid
  TestValidator.equals(
    "paid items count matches order items",
    paidItemsResult.pagination.records,
    order.orderItems.length,
  );
  // Test filtering by 'shipped' status - should return empty for new order
  const shippedItemsResult =
    await api.functional.ecommerceMall.admin.orders.items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          status: "shipped",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(shippedItemsResult);
  // New orders have no shipped items
  TestValidator.equals(
    "shipped items count is zero for new order",
    shippedItemsResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "shipped items data is empty",
    shippedItemsResult.data.length,
    0,
  );
  // Test filtering by 'delivered' status - should return empty for new order
  const deliveredItemsResult =
    await api.functional.ecommerceMall.admin.orders.items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          status: "delivered",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(deliveredItemsResult);
  // New orders have no delivered items
  TestValidator.equals(
    "delivered items count is zero for new order",
    deliveredItemsResult.pagination.records,
    0,
  );
  // Test filtering by 'cancelled' status - should return empty for new order
  const cancelledItemsResult =
    await api.functional.ecommerceMall.admin.orders.items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          status: "cancelled",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(cancelledItemsResult);
  // New orders have no cancelled items
  TestValidator.equals(
    "cancelled items count is zero for new order",
    cancelledItemsResult.pagination.records,
    0,
  );
  // Test filtering by 'refunded' status - should return empty for new order
  const refundedItemsResult =
    await api.functional.ecommerceMall.admin.orders.items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          status: "refunded",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(refundedItemsResult);
  // New orders have no refunded items
  TestValidator.equals(
    "refunded items count is zero for new order",
    refundedItemsResult.pagination.records,
    0,
  );
  // Test without status filter - should return all items
  const allItemsResult =
    await api.functional.ecommerceMall.admin.orders.items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allItemsResult);
  // Without filter, should return all order items
  TestValidator.equals(
    "all items returned without status filter",
    allItemsResult.pagination.records,
    order.orderItems.length,
  );
  TestValidator.equals(
    "data length matches pagination records",
    allItemsResult.data.length,
    order.orderItems.length,
  );
  // Verify that order item summaries contain required fields
  for (const item of paidItemsResult.data) {
    TestValidator.predicate("item has valid id", item.id.length > 0);
    TestValidator.predicate("item has valid quantity", item.quantity > 0);
    TestValidator.predicate("item has valid price", item.priceAtPurchase >= 0);
    TestValidator.predicate("item has product info", item.product !== null);
    TestValidator.predicate("item has variant info", item.variant !== null);
    TestValidator.predicate("item has seller info", item.seller !== null);
  }
}
