import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipmentAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipmentAuditLog";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
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
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test filtering audit logs by event_type to isolate specific lifecycle events.
 *
 * This test validates:
 * 1. Filtering by event_type='created' returns only the shipment creation audit entry
 * 2. Filtering by event_type='delivered_manually' returns only the delivery confirmation audit entry
 * 3. Multiple event types exist in the full audit log but are correctly filtered when specified
 * 4. The actor_type correctly reflects 'seller' for created events and 'customer' for delivered_manually events
 */
export async function test_api_shipment_audit_logs_filter_by_event_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin to approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 2: Create seller and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Step 3: Create product with variant and inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  const inventory =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      { params: { variantId: variant.id } },
    );
  typia.assert(inventory);
  // Step 4: Customer setup - register and place order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Add to cart
  const cartItem = await generate_random_shopping_mall_customer_cart_create(
    customerConnection,
    { body: { variantId: variant.id, quantity: 1 } },
  );
  typia.assert(cartItem);
  // Create order (address_id must reference existing customer address)
  // Note: This assumes the system has pre-existing addresses or the API handles this internally
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Step 5: Seller creates shipment for the order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds,
          carrierName: "FedEx",
          trackingNumber: "FX123456789",
        },
      },
    );
  typia.assert(shipment);
  // Step 6: Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  // Step 7: Test filter by event_type='created'
  const createdLogs =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: { event_type: "created" },
      },
    );
  typia.assert(createdLogs);
  TestValidator.equals("created logs count", createdLogs.data.length, 1);
  TestValidator.equals(
    "created event type",
    createdLogs.data[0].event_type,
    "created",
  );
  TestValidator.equals(
    "created actor type",
    createdLogs.data[0].actor_type,
    "seller",
  );
  TestValidator.equals(
    "created old status",
    createdLogs.data[0].old_status,
    null,
  );
  TestValidator.equals(
    "created new status",
    createdLogs.data[0].new_status,
    "shipped",
  );
  // Step 8: Test filter by event_type='delivered_manually'
  const deliveredLogs =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: { event_type: "delivered_manually" },
      },
    );
  typia.assert(deliveredLogs);
  TestValidator.equals(
    "delivered_manually logs count",
    deliveredLogs.data.length,
    1,
  );
  TestValidator.equals(
    "delivered_manually event type",
    deliveredLogs.data[0].event_type,
    "delivered_manually",
  );
  TestValidator.equals(
    "delivered_manually actor type",
    deliveredLogs.data[0].actor_type,
    "customer",
  );
  TestValidator.equals(
    "delivered_manually old status",
    deliveredLogs.data[0].old_status,
    "shipped",
  );
  TestValidator.equals(
    "delivered_manually new status",
    deliveredLogs.data[0].new_status,
    "delivered",
  );
  // Step 9: Test unfiltered query returns both
  const allLogs =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(allLogs);
  TestValidator.equals("all logs count", allLogs.data.length, 2);
  TestValidator.predicate(
    "contains created event",
    allLogs.data.some((log) => log.event_type === "created"),
  );
  TestValidator.predicate(
    "contains delivered_manually event",
    allLogs.data.some((log) => log.event_type === "delivered_manually"),
  );
}
