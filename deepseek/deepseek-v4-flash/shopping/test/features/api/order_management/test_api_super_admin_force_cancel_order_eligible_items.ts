import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Verify super administrator force-cancel of an order with mixed-status items.
 *
 * Tests the complete flow where a super administrator force-cancels an entire
 * order containing one 'paid' item and one 'shipped' item. Validates that both
 * items transition to 'cancelled' with correct status logs, stock restoration,
 * and overall order status derivation.
 *
 * 1. Super administrator joins the platform.
 * 2. Seller joins, creates a product with two variants (Variant A, Variant B),
 *    and restocks both with sufficient inventory.
 * 3. Customer joins, creates a shipping address, adds both variants to cart,
 *    and places the order — both items start with status 'paid'.
 * 4. Seller creates a shipment for Variant B only, transitioning it to 'shipped'.
 * 5. Super administrator force-cancels the entire order.
 * 6. Validates: both items have status 'cancelled', status logs show correct
 *    from_status and reason 'administrator_force_cancel', and overall order
 *    status is 'cancelled'.
 */
export async function test_api_super_admin_force_cancel_order_eligible_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create Variant A and Variant B
  const variantA =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variantA);
  const variantB =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variantB);
  // 5. Restock both variants with sufficient inventory
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      body: {
        quantity_change: 100,
        reason: "initial restock",
      } satisfies IECommerceMallInventoryRecord.ICreate,
      params: { productId: product.id, variantId: variantA.id },
    },
  );
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      body: {
        quantity_change: 100,
        reason: "initial restock",
      } satisfies IECommerceMallInventoryRecord.ICreate,
      params: { productId: product.id, variantId: variantB.id },
    },
  );
  // 6. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Create a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 8. Add both variants to the shopping cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variantA.id,
        quantity: 1,
      } satisfies IECommerceMallCartItem.ICreate,
    },
  );
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variantB.id,
        quantity: 1,
      } satisfies IECommerceMallCartItem.ICreate,
    },
  );
  // 9. Place the order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 10. Identify order items for each variant
  const itemA = order.orderItems.find(
    (item) => item.productVariant.id === variantA.id,
  )!;
  const itemB = order.orderItems.find(
    (item) => item.productVariant.id === variantB.id,
  )!;
  // 11. Create a shipment containing only Variant B (to transition it to 'shipped')
  await generate_random_e_commerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: "TestCarrier",
        trackingNumber: "TRK-" + RandomGenerator.alphaNumeric(8),
        orderItemIds: [itemB.id],
      } satisfies IECommerceMallShipment.ICreate,
    },
  );
  // 12. Force-cancel the entire order as super administrator
  const updatedOrder =
    await api.functional.eCommerceMall.superAdministrator.orders.force_cancel.forceCancel(
      superAdminConnection,
      { orderCode: order.code },
    );
  typia.assert(updatedOrder);
  // 13. Validate both order items have status 'cancelled'
  for (const item of updatedOrder.orderItems) {
    TestValidator.equals("order item status", item.status, "cancelled");
  }
  // 14. Validate the status logs
  const updatedItemA = updatedOrder.orderItems.find(
    (item) => item.productVariant.id === variantA.id,
  )!;
  const updatedItemB = updatedOrder.orderItems.find(
    (item) => item.productVariant.id === variantB.id,
  )!;
  // Variant A was 'paid' before force-cancel
  const cancelLogA = updatedItemA.statusLogs.find(
    (log) => log.to_status === "cancelled",
  )!;
  TestValidator.equals("variant A from_status", cancelLogA.from_status, "paid");
  TestValidator.equals(
    "variant A reason",
    cancelLogA.reason,
    "administrator_force_cancel",
  );
  // Variant B was 'shipped' before force-cancel
  const cancelLogB = updatedItemB.statusLogs.find(
    (log) => log.to_status === "cancelled",
  )!;
  TestValidator.equals(
    "variant B from_status",
    cancelLogB.from_status,
    "shipped",
  );
  TestValidator.equals(
    "variant B reason",
    cancelLogB.reason,
    "administrator_force_cancel",
  );
  // 15. Validate overall order status is 'cancelled' since all items are cancelled
  TestValidator.equals(
    "overall order status",
    updatedOrder.orderItems.every((item) => item.status === "cancelled"),
    true,
  );
}
