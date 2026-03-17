import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
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

export async function test_api_shipment_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
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
      ip: undefined,
    },
  });
  // 2. Create product with variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create multiple variants for the product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: 100,
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(9)}`,
          stock_quantity: 100,
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        },
      },
    );
  typia.assert(variant2);
  // 3. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
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
    },
  });
  // 4. Customer adds items to cart
  await generate_random_shopping_mall_customer_customers_cart_items_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant1.id,
        quantity: 2,
      },
    },
  );
  await generate_random_shopping_mall_customer_customers_cart_items_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant2.id,
        quantity: 1,
      },
    },
  );
  // 5. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Get order item IDs for shipment
  const orderItemIds = order.items.map((item) => item.id);
  TestValidator.predicate("order has items", orderItemIds.length >= 2);
  // 6. Seller creates shipment with all order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: "TestCarrier",
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
      },
    },
  );
  typia.assert(shipment);
  // 7. Customer confirms delivery - this changes items to DELIVERED status
  const deliveryConfirmation =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // 8. Test filtering by DELIVERED status
  const deliveredItemsResult =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        body: {
          status: "DELIVERED",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(deliveredItemsResult);
  // Validate DELIVERED filter results
  TestValidator.predicate(
    "delivered items count > 0",
    deliveredItemsResult.data.length > 0,
  );
  TestValidator.equals(
    "pagination records matches data length",
    deliveredItemsResult.pagination.records,
    deliveredItemsResult.data.length,
  );
  // Verify all returned items have DELIVERED status
  for (const item of deliveredItemsResult.data) {
    TestValidator.equals(
      `item ${item.id} status`,
      item.orderItem.status,
      "DELIVERED",
    );
  }
  // 9. Test filtering by SHIPPED status (should return 0 items after delivery confirmation)
  const shippedItemsResult =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        body: {
          status: "SHIPPED",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(shippedItemsResult);
  // After delivery confirmation, no items should be in SHIPPED status
  TestValidator.equals(
    "shipped items count after delivery",
    shippedItemsResult.data.length,
    0,
  );
  TestValidator.equals(
    "shipped pagination records",
    shippedItemsResult.pagination.records,
    0,
  );
  // 10. Test filtering by PAID status (should also return 0 after delivery)
  const paidItemsResult =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        body: {
          status: "PAID",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(paidItemsResult);
  TestValidator.equals(
    "paid items count after delivery",
    paidItemsResult.data.length,
    0,
  );
}