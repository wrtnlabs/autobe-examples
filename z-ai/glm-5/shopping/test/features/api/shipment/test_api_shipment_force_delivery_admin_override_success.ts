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
 * Test the primary success path for admin force delivery confirmation.
 * An administrator forcibly confirms delivery of a shipped order when
 * the customer has not confirmed and the 14-day auto-delivery period
 * has not elapsed.
 *
 * **Test Flow:**
 * 1. Admin joins and authenticates
 * 2. Seller joins, gets approved by admin
 * 3. Seller creates product and adds variant with stock
 * 4. Customer joins, adds variant to cart, places order
 * 5. Seller ships items with carrier and tracking info
 * 6. Admin force-confirms delivery with notes
 *
 * **Validations:**
 * - Response contains shipment with delivered_at timestamp set
 * - delivery_confirmation_method equals 'admin_override'
 * - Seller summary included in response
 */
export async function test_api_shipment_force_delivery_admin_override_success(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // 1. Admin Setup
  // ===========================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // ===========================================
  // 2. Seller Setup and Approval
  // ===========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // ===========================================
  // 3. Product and Variant Creation
  // ===========================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
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
  // 4. Customer Setup and Order Creation
  // ===========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  // Add variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // Place order with random address_id
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: { address_id: addressId } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order items have 'paid' status
  TestValidator.predicate(
    "order items have paid status",
    order.orderItems.every((item) => item.status === "paid"),
  );
  // ===========================================
  // 5. Seller Creates Shipment
  // ===========================================
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment =
    await api.functional.shoppingMall.seller.sellers.me.shipments.create(
      sellerConnection,
      {
        body: {
          orderItemIds: orderItemIds,
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallOrderShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Verify shipment was created with shipped_at
  TestValidator.predicate(
    "shipment has shipped_at",
    shipment.shipped_at !== null,
  );
  TestValidator.equals(
    "shipment not yet delivered",
    shipment.delivered_at,
    null,
  );
  // ===========================================
  // 6. Admin Force Delivery
  // ===========================================
  const forceDeliveryNotes =
    "Admin override: Customer confirmed delivery via phone support";
  const updatedShipment =
    await api.functional.shoppingMall.admin.shipments.force_delivery.forceDelivery(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          notes: forceDeliveryNotes,
        } satisfies IShoppingMallOrderShipment.IForceDelivery,
      },
    );
  typia.assert(updatedShipment);
  // ===========================================
  // 7. Validations
  // ===========================================
  // Verify delivered_at is now set
  TestValidator.predicate(
    "delivered_at timestamp is set",
    updatedShipment.delivered_at !== null,
  );
  // Verify delivery_confirmation_method is 'admin_override'
  TestValidator.equals(
    "delivery confirmation method is admin_override",
    updatedShipment.delivery_confirmation_method,
    "admin_override",
  );
  // Verify seller info is present
  TestValidator.predicate(
    "seller summary is present",
    updatedShipment.seller !== null,
  );
  TestValidator.equals(
    "seller shop name matches",
    updatedShipment.seller.shopName,
    sellerAuth.shopName,
  );
}
