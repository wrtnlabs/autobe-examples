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

/**
 * Test that an administrator can view full shipment details for an in-transit shipment.
 *
 * Validates the admin cross-role visibility by having an administrator retrieve a shipment
 * that was created by a seller for a customer's order. Confirms that delivery tracking
 * fields (carrier_name, tracking_number, created_at) are present, delivered_at is null
 * indicating the package is still in transit, and all contained order items carry their
 * purchase-time product, variant, and seller snapshots with frozen prices and quantities.
 *
 * Also verifies that the shipment's order reference (code, total_price, status) and
 * seller reference (email, approval_status) are correctly populated, confirming the
 * administrator can identify both the purchasing context and the shipping seller.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Seller registers and authenticates via authorize_seller_join.
 * 3. Administrator approves the seller's pending registration.
 * 4. Administrator creates a product category.
 * 5. Seller creates a product under the newly created category.
 * 6. Seller creates a variant (SKU) with option values for the product.
 * 7. Seller adds initial stock to the variant via an inventory record.
 * 8. Customer registers and authenticates via authorize_customer_join.
 * 9. Customer places an order with the in-stock variant.
 * 10. Seller creates a shipment for the paid order items.
 * 11. Administrator retrieves the shipment by order code and shipment ID.
 * 12. Validates shipment delivery state, order items with snapshots, order and seller references.
 */
export async function test_api_shipment_admin_view_in_transit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Admin creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  // 6. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  // 7. Seller adds inventory
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
    },
  );
  // 8. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 9. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order);
  // 10. Seller creates shipment
  const orderItem = order.items[0];
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem.id],
          carrier_name: "ExpressCourier",
          tracking_number: "EXP-2026-0001",
        },
      },
    );
  typia.assert(shipment);
  // 11. Admin retrieves the shipment
  const retrieved = await api.functional.shoppingMall.admin.orders.shipments.at(
    adminConnection,
    {
      orderCode: order.code,
      shipmentId: shipment.id,
    },
  );
  typia.assert(retrieved);
  // 12. Validate shipment delivery state — in transit
  TestValidator.predicate(
    "delivered_at is null indicating in-transit",
    retrieved.delivered_at === null,
  );
  TestValidator.equals(
    "carrier_name",
    retrieved.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "tracking_number",
    retrieved.tracking_number,
    shipment.tracking_number,
  );
  // 13. Validate order items with purchase-time snapshots
  TestValidator.predicate(
    "shipment contains order items",
    retrieved.orderItems.length > 0,
  );
  const retrievedItem = retrieved.orderItems[0];
  TestValidator.equals(
    "order item quantity",
    retrievedItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "order item price frozen at purchase",
    retrievedItem.price,
    orderItem.price,
  );
  // Product snapshot
  TestValidator.predicate(
    "product snapshot exists",
    retrievedItem.productSnapshot !== null,
  );
  if (retrievedItem.productSnapshot !== null) {
    TestValidator.equals(
      "product snapshot name",
      retrievedItem.productSnapshot.name,
      product.name,
    );
    TestValidator.equals(
      "product snapshot base_price",
      retrievedItem.productSnapshot.base_price,
      product.base_price,
    );
  }
  // Variant snapshot
  TestValidator.predicate(
    "variant snapshot exists",
    retrievedItem.variantSnapshot !== null,
  );
  if (retrievedItem.variantSnapshot !== null) {
    TestValidator.equals(
      "variant snapshot sku_code",
      retrievedItem.variantSnapshot.sku_code,
      variant.code,
    );
    TestValidator.equals(
      "variant snapshot price",
      retrievedItem.variantSnapshot.price,
      variant.price ?? product.base_price,
    );
  }
  // Seller snapshot
  TestValidator.predicate(
    "seller snapshot exists",
    retrievedItem.sellerSnapshot !== null,
  );
  // 14. Validate order reference
  TestValidator.equals("order code", retrieved.order.code, order.code);
  TestValidator.equals(
    "order total_price",
    retrieved.order.total_price,
    order.total_price,
  );
  TestValidator.equals("order status", retrieved.order.status, "shipped");
  // 15. Validate seller reference
  TestValidator.equals("seller email", retrieved.seller.email, seller.email);
  TestValidator.equals(
    "seller approval_status",
    retrieved.seller.approval_status,
    "approved",
  );
}
