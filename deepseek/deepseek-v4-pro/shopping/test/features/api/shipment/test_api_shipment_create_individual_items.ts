import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_shipment_create_individual_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup — register and create a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  typia.assert(product);
  // 4. Seller creates two variants with stock
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant1);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant1.id },
      body: { quantity_change: 10, reason: "Initial stock" },
    },
  );
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant2);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant2.id },
      body: { quantity_change: 10, reason: "Initial stock" },
    },
  );
  // 5. Customer registration and order placement
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
  // 6. Identify the two order items
  const orderItem1 = typia.assert(
    order.items.find((i) => i.variant.id === variant1.id)!,
  );
  const orderItem2 = typia.assert(
    order.items.find((i) => i.variant.id === variant2.id)!,
  );
  // 7. Create the first shipment with only the first order item
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem1.id],
          carrier_name: "UPS",
          tracking_number: "UPS001",
        },
      },
    );
  typia.assert(shipment1);
  // 8. Create the second shipment with only the second order item
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem2.id],
          carrier_name: "DHL",
          tracking_number: "DHL002",
        },
      },
    );
  typia.assert(shipment2);
  // 9. Validate first shipment
  TestValidator.equals(
    "shipment1 has exactly one item",
    shipment1.orderItems.length,
    1,
  );
  TestValidator.equals(
    "shipment1 carrier is UPS",
    shipment1.carrier_name,
    "UPS",
  );
  TestValidator.equals(
    "shipment1 tracking is UPS001",
    shipment1.tracking_number,
    "UPS001",
  );
  TestValidator.equals(
    "shipment1 item status is shipped",
    shipment1.orderItems[0].status,
    "shipped",
  );
  // 10. Validate second shipment
  TestValidator.equals(
    "shipment2 has exactly one item",
    shipment2.orderItems.length,
    1,
  );
  TestValidator.equals(
    "shipment2 carrier is DHL",
    shipment2.carrier_name,
    "DHL",
  );
  TestValidator.equals(
    "shipment2 tracking is DHL002",
    shipment2.tracking_number,
    "DHL002",
  );
  TestValidator.equals(
    "shipment2 item status is shipped",
    shipment2.orderItems[0].status,
    "shipped",
  );
  // 11. Cross-shipment validations
  TestValidator.notEquals("shipments are distinct", shipment1.id, shipment2.id);
  TestValidator.notEquals(
    "carriers differ between shipments",
    shipment1.carrier_name,
    shipment2.carrier_name,
  );
  TestValidator.notEquals(
    "tracking numbers differ between shipments",
    shipment1.tracking_number,
    shipment2.tracking_number,
  );
  TestValidator.notEquals(
    "no item appears in both shipments",
    shipment1.orderItems[0].id,
    shipment2.orderItems[0].id,
  );
  // 12. Validate order status reflects all items shipped
  TestValidator.equals(
    "order status is shipped after all items dispatched",
    shipment2.order.status,
    "shipped",
  );
}
