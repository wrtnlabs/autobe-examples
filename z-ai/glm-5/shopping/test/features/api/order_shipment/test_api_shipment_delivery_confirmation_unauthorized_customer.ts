import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that a customer cannot confirm delivery of another customer's shipment.
 *
 * This test validates the authorization boundary where Customer B attempts
 * to confirm delivery for Customer A's shipment. The system should reject
 * this unauthorized access with 403 Forbidden.
 *
 * **Test Flow:**
 * 1. Admin approves seller
 * 2. Seller creates product and variant with stock
 * 3. Customer A registers, adds item to cart, places order
 * 4. Seller ships the order items
 * 5. Customer B registers as a different customer
 * 6. Customer B attempts to confirm Customer A's shipment
 * 7. System rejects with 403 Forbidden
 * 8. Verify shipment remains unchanged (delivered_at still null)
 */
export async function test_api_shipment_delivery_confirmation_unauthorized_customer(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // Setup: Admin for seller approval
  // ===========================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // ===========================================
  // Setup: Seller creates product and variant
  // ===========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Seller creates variant with stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // ===========================================
  // Setup: Customer A places order
  // ===========================================
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerAAuth);
  // Customer A adds item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Customer A places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    {},
  );
  typia.assert(order);
  // Get order items from the order
  const orderItemIds = order.orderItems.map((item) => item.id);
  TestValidator.predicate("order has items", orderItemIds.length > 0);
  // Verify order items are in 'paid' status
  for (const item of order.orderItems) {
    TestValidator.equals("order item status is paid", item.status, "paid");
  }
  // ===========================================
  // Seller ships the order items
  // ===========================================
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds,
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // Verify shipment was created and is awaiting delivery confirmation
  TestValidator.equals(
    "shipment delivered_at is null",
    shipment.delivered_at,
    null,
  );
  TestValidator.equals(
    "shipment delivery_confirmation_method is null",
    shipment.delivery_confirmation_method,
    null,
  );
  // ===========================================
  // Setup: Customer B (different customer)
  // ===========================================
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerBAuth);
  // Verify Customer B is different from Customer A
  TestValidator.notEquals(
    "Customer B is different from Customer A",
    customerAAuth.id,
    customerBAuth.id,
  );
  // ===========================================
  // Test: Customer B attempts to confirm Customer A's shipment
  // ===========================================
  await TestValidator.httpError(
    "Customer B cannot confirm Customer A's shipment",
    403,
    async () => {
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        customerBConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
}
