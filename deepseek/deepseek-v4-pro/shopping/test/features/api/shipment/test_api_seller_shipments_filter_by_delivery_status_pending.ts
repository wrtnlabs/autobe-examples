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

/**
 * Test that a seller can filter shipments by deliveryStatus "pending", excluding delivered ones.
 *
 * Validates the PATCH /shoppingMall/seller/shipments endpoint's delivery status filtering. Two orders are created for the same product variant — one shipment is confirmed delivered by the customer, the other remains in transit. The seller then queries for pending shipments and verifies only the unconfirmed shipment is returned with correct pagination metadata.
 *
 * A follow-up query with deliveryStatus "delivered" confirms the inverse: only the confirmed-delivery shipment appears, validating bidirectional filter correctness.
 *
 * 1. Administrator registers and approves the seller.
 * 2. Seller creates a product and a variant with stock.
 * 3. Customer registers, adds variant to cart, and places the first order.
 * 4. Seller creates a shipment for the first order.
 * 5. Customer confirms delivery of the first shipment (→ delivered).
 * 6. Customer repeats: adds variant to cart, places second order.
 * 7. Seller creates a shipment for the second order (remains pending).
 * 8. Seller filters shipments by deliveryStatus "pending".
 * 9. Validates all returned shipments are pending, none delivered, pagination correct.
 * 10. Seller filters by "delivered" to confirm delivered shipment is returned exclusively.
 */
export async function test_api_seller_shipments_filter_by_delivery_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates variant with stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: 10 },
      },
    );
  typia.assert(variant);
  // 6. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer adds variant to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant.id, quantity: 1 },
    },
  );
  // 8. Customer places first order
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order1);
  // 9. Seller creates shipment for first order
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: { orderItemIds: [order1.items[0].id] },
      },
    );
  typia.assert(shipment1);
  // 10. Customer confirms delivery of first shipment
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment1.id },
    );
  typia.assert(deliveredShipment);
  // 11. Customer adds variant to cart again
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant.id, quantity: 1 },
    },
  );
  // 12. Customer places second order
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order2);
  // 13. Seller creates shipment for second order (remains pending)
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: { orderItemIds: [order2.items[0].id] },
      },
    );
  typia.assert(shipment2);
  // 14. Seller filters shipments by deliveryStatus "pending"
  const pendingResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { deliveryStatus: "pending" },
    });
  typia.assert(pendingResult);
  // 15. Validate pending shipments
  TestValidator.predicate(
    "all returned shipments have pending status",
    pendingResult.data.every((s) => s.deliveryStatus === "pending"),
  );
  TestValidator.predicate(
    "pending shipment2 appears in results",
    pendingResult.data.some((s) => s.id === shipment2.id),
  );
  TestValidator.predicate(
    "no delivered shipment in pending results",
    pendingResult.data.every((s) => s.deliveryStatus !== "delivered"),
  );
  TestValidator.predicate(
    "pagination records reflect pending count",
    pendingResult.pagination.records >= 1,
  );
  // 16. Seller filters by deliveryStatus "delivered" to confirm inverse
  const deliveredResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { deliveryStatus: "delivered" },
    });
  typia.assert(deliveredResult);
  TestValidator.predicate(
    "all returned shipments have delivered status",
    deliveredResult.data.every((s) => s.deliveryStatus === "delivered"),
  );
  TestValidator.predicate(
    "delivered shipment1 appears in results",
    deliveredResult.data.some((s) => s.id === shipment1.id),
  );
  TestValidator.predicate(
    "no pending shipment in delivered results",
    deliveredResult.data.every((s) => s.deliveryStatus !== "pending"),
  );
}
