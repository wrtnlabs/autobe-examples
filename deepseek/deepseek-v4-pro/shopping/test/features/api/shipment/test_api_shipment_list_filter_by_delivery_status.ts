import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test shipment listing with delivery status filtering and cursor-based pagination.
 *
 * Validates that the customer's order shipments endpoint correctly filters shipments
 * by delivery status and supports cursor-based pagination. The test sets up a complete
 * order lifecycle — admin creates a category, seller creates a product with two variants,
 * customer places an order with both variants, seller ships each variant in its own
 * shipment, and the customer confirms delivery of one shipment.
 *
 * 1. Administrator creates a product category.
 * 2. Seller creates a product with two variants and adds inventory.
 * 3. Customer places an order with one unit of each variant.
 * 4. Seller creates two separate shipments, each containing one order item.
 * 5. Customer confirms delivery of the second shipment.
 * 6. Lists shipments with deliveryStatus "pending" — expects only the unconfirmed shipment.
 * 7. Lists shipments with deliveryStatus "delivered" — expects only the confirmed shipment.
 * 8. Lists shipments without filter — expects both shipments.
 * 9. Tests cursor-based pagination with pageSize of 1 — verifies two pages with 1 item each.
 */
export async function test_api_shipment_list_filter_by_delivery_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — create a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup — create product with two variants and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant2);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant1.id },
      body: { quantity_change: 10, reason: "Initial stock" },
    },
  );
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant2.id },
      body: { quantity_change: 10, reason: "Initial stock" },
    },
  );
  // 3. Customer setup — place order with both variants
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          { variant_id: variant1.id, quantity: 1 },
          { variant_id: variant2.id, quantity: 1 },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItem1 = order.items[0];
  const orderItem2 = order.items[1];
  // 4. Seller creates two separate shipments
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: { orderItemIds: [orderItem1.id] },
      },
    );
  typia.assert(shipment1);
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: { orderItemIds: [orderItem2.id] },
      },
    );
  typia.assert(shipment2);
  // 5. Customer confirms delivery of shipment2
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment2.id },
    );
  typia.assert(confirmedShipment);
  // 6. Filter by "pending" — only shipment1 (delivery not confirmed)
  const pendingResult =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: { deliveryStatus: "pending" },
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals("pending shipments count", pendingResult.data.length, 1);
  TestValidator.equals(
    "pending shipment id matches",
    pendingResult.data[0].id,
    shipment1.id,
  );
  TestValidator.predicate(
    "pending shipment has pending deliveryStatus",
    pendingResult.data[0].deliveryStatus === "pending",
  );
  // 7. Filter by "delivered" — only shipment2 (delivery confirmed)
  const deliveredResult =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: { deliveryStatus: "delivered" },
      },
    );
  typia.assert(deliveredResult);
  TestValidator.equals(
    "delivered shipments count",
    deliveredResult.data.length,
    1,
  );
  TestValidator.equals(
    "delivered shipment id matches",
    deliveredResult.data[0].id,
    shipment2.id,
  );
  TestValidator.predicate(
    "delivered shipment has delivered deliveryStatus",
    deliveredResult.data[0].deliveryStatus === "delivered",
  );
  // 8. No filter — both shipments
  const allResult =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(allResult);
  TestValidator.equals("all shipments count", allResult.data.length, 2);
  // 9. Cursor-based pagination — pageSize 1 yields 2 pages
  const page1Result =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: { pageSize: 1 },
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page1 data count", page1Result.data.length, 1);
  TestValidator.equals(
    "page1 pagination pages",
    page1Result.pagination.pages,
    2,
  );
  TestValidator.equals(
    "page1 pagination records",
    page1Result.pagination.records,
    2,
  );
}
