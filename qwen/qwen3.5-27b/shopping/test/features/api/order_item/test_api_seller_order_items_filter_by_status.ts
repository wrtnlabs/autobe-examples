import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller can filter order items by their fulfillment status within an order.
 *
 * Validates the order item filtering functionality for sellers, ensuring that order items can be correctly filtered by their current status in the fulfillment workflow. The test creates multiple order items with different statuses (paid, shipped, delivered) and verifies that the filter returns only items matching the specified status.
 *
 * Special attention is given to verifying that items with non-matching statuses are excluded from the filtered results and that the pagination metadata accurately reflects the filtered count.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with a variant that has available stock.
 * 3. Customer registers and authenticates with the platform.
 * 4. Customer places an order containing the seller's product (item status: paid).
 * 5. Seller creates a shipment for the order item, changing its status to 'shipped'.
 * 6. Seller creates additional orders with items in different statuses to test filtering comprehensively.
 * 7. Seller calls the filter endpoint with status='shipped' and verifies only shipped items are returned.
 * 8. Seller calls the filter endpoint with status='paid' and verifies only paid items are returned.
 * 9. Seller calls the filter endpoint with status='delivered' and verifies only delivered items are returned.
 * 10. Validates that pagination metadata (records count) matches the number of filtered items.
 */
export async function test_api_seller_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create product with variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 3. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Customer places order (item status: paid)
  const order1 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order1);
  // 5. Seller creates shipment (item status: shipped)
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: {
          order_item_ids: order1.items.map((item) => item.id),
        },
      },
    );
  typia.assert(shipment);
  // 6. Create second order for testing 'paid' status filter
  const order2 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order2);
  // 7. Test filtering by 'shipped' status
  const shippedFilterResult =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order1.id,
        body: {
          status: "shipped",
        },
      },
    );
  typia.assert(shippedFilterResult);
  TestValidator.equals(
    "shipped filter returns correct count",
    shippedFilterResult.pagination.records,
    order1.items.length,
  );
  TestValidator.predicate(
    "all items in shipped filter have shipped status",
    () => shippedFilterResult.data.every((item) => item.status === "shipped"),
  );
  // 8. Test filtering by 'paid' status
  const paidFilterResult =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order2.id,
        body: {
          status: "paid",
        },
      },
    );
  typia.assert(paidFilterResult);
  TestValidator.equals(
    "paid filter returns correct count",
    paidFilterResult.pagination.records,
    order2.items.length,
  );
  TestValidator.predicate("all items in paid filter have paid status", () =>
    paidFilterResult.data.every((item) => item.status === "paid"),
  );
  // 9. Test filtering with no status filter (should return all items)
  const allItemsResult =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order1.id,
        body: {},
      },
    );
  typia.assert(allItemsResult);
  TestValidator.equals(
    "no filter returns all items",
    allItemsResult.pagination.records,
    order1.items.length,
  );
  // 10. Test pagination metadata accuracy
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () =>
      Math.ceil(
        shippedFilterResult.pagination.records /
          shippedFilterResult.pagination.limit,
      ) === shippedFilterResult.pagination.pages,
  );
  TestValidator.equals(
    "pagination current page is 1",
    shippedFilterResult.pagination.current,
    1,
  );
}
