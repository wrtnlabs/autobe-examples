import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_admin_order_shipments_list_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Seller A setup — join and approve
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerA.id,
  });
  // 4. Seller B setup — join and approve
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerB.id,
  });
  // 5. Seller A creates product, variant, and inventory
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      { params: { productId: productA.id } },
    );
  typia.assert(variantA);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerAConnection,
    {
      params: { productId: productA.id, variantId: variantA.id },
      body: { quantity_change: 100, reason: "Initial stock" },
    },
  );
  // 6. Seller B creates product, variant, and inventory
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {},
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      { params: { productId: productB.id } },
    );
  typia.assert(variantB);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerBConnection,
    {
      params: { productId: productB.id, variantId: variantB.id },
      body: { quantity_change: 100, reason: "Initial stock" },
    },
  );
  // 7. Customer adds both variants to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    { body: { productVariantId: variantA.id, quantity: 1 } },
  );
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    { body: { productVariantId: variantB.id, quantity: 1 } },
  );
  // 8. Customer places order with both items
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          { variant_id: variantA.id, quantity: 1 },
          { variant_id: variantB.id, quantity: 1 },
        ],
      },
    },
  );
  typia.assert(order);
  // 9. Find order items belonging to each seller
  const sellerAOrderItems = order.items.filter(
    (item) => item.variant.id === variantA.id,
  );
  const sellerBOrderItems = order.items.filter(
    (item) => item.variant.id === variantB.id,
  );
  // 10. Seller A creates shipment with distinct carrier
  const shipmentA =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: sellerAOrderItems.map((i) => i.id),
          carrier_name: "FedEx",
          tracking_number: "FEDEX-A-987654321",
        },
      },
    );
  typia.assert(shipmentA);
  // 11. Seller B creates shipment with different carrier
  const shipmentB =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerBConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: sellerBOrderItems.map((i) => i.id),
          carrier_name: "UPS",
          tracking_number: "UPS-B-123456789",
        },
      },
    );
  typia.assert(shipmentB);
  // 12. Admin lists all shipments for the order (default pagination, no filters)
  const page = await api.functional.shoppingMall.admin.orders.shipments.index(
    adminConnection,
    {
      orderId: order.id,
      body: {} satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(page);
  // 13. Validate pagination metadata
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination total records", page.pagination.records, 2);
  TestValidator.equals("pagination total pages", page.pagination.pages, 1);
  // 14. Validate exactly 2 shipments
  TestValidator.equals("shipments count", page.data.length, 2);
  // 15. Validate distinct carriers and tracking numbers
  TestValidator.predicate(
    "distinct carriers",
    page.data[0].carrier_name !== page.data[1].carrier_name,
  );
  TestValidator.predicate(
    "distinct tracking numbers",
    page.data[0].tracking_number !== page.data[1].tracking_number,
  );
  // 16. Validate newest-first sorting
  TestValidator.predicate(
    "sorted by created_at descending (newest first)",
    page.data[0].created_at >= page.data[1].created_at,
  );
  // 17. Validate each shipment structure
  for (const shipment of page.data) {
    TestValidator.predicate("shipment has valid id", shipment.id.length > 0);
    TestValidator.predicate(
      "shipment has carrier_name",
      shipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      "shipment has tracking_number",
      shipment.tracking_number.length > 0,
    );
    TestValidator.equals(
      "delivered_at is null for in-transit shipment",
      shipment.delivered_at,
      null,
    );
    TestValidator.equals(
      "deliveryStatus is pending",
      shipment.deliveryStatus,
      "pending",
    );
    TestValidator.predicate(
      "has seller shop name",
      shipment.seller.profile.shop_name !== undefined,
    );
    TestValidator.predicate(
      "has order code reference",
      shipment.order.code.length > 0,
    );
    TestValidator.predicate(
      "has at least one order item",
      shipment.orderItems.length > 0,
    );
  }
  // 18. Validate shipments belong to different sellers
  TestValidator.predicate(
    "shipments from different sellers",
    page.data[0].seller.id !== page.data[1].seller.id,
  );
}
