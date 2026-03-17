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

/**
 * Test seller retrieving all order items within a shipment they created.
 *
 * This test validates the complete workflow:
 * 1. Seller registers and creates a product with multiple variants
 * 2. Customer registers and places an order with multiple items from the seller
 * 3. Seller creates a shipment bundling multiple order items together
 * 4. Seller retrieves all items in the shipment via the list endpoint
 * 5. Validates response contains all items with correct details and SHIPPED status
 */
export async function test_api_shipment_items_list_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
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
      ip: undefined,
    },
  });
  // 2. Seller creates product with multiple variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create first variant
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<50000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: [
            {
              key: "Color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
          ],
        },
      },
    );
  typia.assert(variant1);
  // Create second variant
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<50000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: [
            {
              key: "Color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
          ],
        },
      },
    );
  typia.assert(variant2);
  // 3. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
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
  // 4. Customer adds both variants to cart
  await generate_random_shopping_mall_customer_customers_cart_items_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant1.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  await generate_random_shopping_mall_customer_customers_cart_items_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant2.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  // 5. Customer places order (this creates order items)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {},
    },
  );
  typia.assert(order);
  // Verify order has multiple items from the seller
  TestValidator.predicate("order has items", () => order.items.length >= 2);
  // 6. Seller creates shipment with all order items
  const orderItemIds = order.items.map((item) => item.id);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
      },
    },
  );
  typia.assert(shipment);
  // 7. Seller retrieves shipment items via the list endpoint
  const shipmentItemsResponse =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          sort: ["created_at,desc"],
        },
      },
    );
  typia.assert(shipmentItemsResponse);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "current page",
    shipmentItemsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    () => shipmentItemsResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "total records matches order items",
    shipmentItemsResponse.pagination.records,
    order.items.length,
  );
  TestValidator.predicate(
    "pages is positive",
    () => shipmentItemsResponse.pagination.pages > 0,
  );
  // 9. Validate all order items are returned
  TestValidator.equals(
    "shipment items count",
    shipmentItemsResponse.data.length,
    order.items.length,
  );
  // 10. Validate each item has SHIPPED status (shipment creation changes item status)
  for (const shipmentItem of shipmentItemsResponse.data) {
    typia.assert(shipmentItem);
    const orderItem = shipmentItem.orderItem;
    // Validate business logic: status is SHIPPED after shipment creation
    TestValidator.equals(
      "order item status is SHIPPED",
      orderItem.status,
      "SHIPPED",
    );
    // Validate quantity is positive
    TestValidator.predicate(
      "quantity is positive",
      () => orderItem.quantity >= 1,
    );
    // Validate unit_price is non-negative
    TestValidator.predicate(
      "unit_price is non-negative",
      () => orderItem.unit_price >= 0,
    );
  }
  // 11. Validate items are sorted by created_at desc
  if (shipmentItemsResponse.data.length > 1) {
    for (let i = 0; i < shipmentItemsResponse.data.length - 1; i++) {
      const currentItem = shipmentItemsResponse.data[i];
      const nextItem = shipmentItemsResponse.data[i + 1];
      TestValidator.predicate(
        "items sorted by created_at desc",
        () =>
          new Date(currentItem.orderItem.created_at).getTime() >=
          new Date(nextItem.orderItem.created_at).getTime(),
      );
    }
  }
}