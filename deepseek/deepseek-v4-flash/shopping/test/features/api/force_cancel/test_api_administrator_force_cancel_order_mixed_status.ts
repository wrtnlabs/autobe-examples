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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
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
 * Test that force-cancelling an order with mixed item statuses correctly cancels
 * eligible items and skips items in terminal states.
 *
 * 1. Administrator creates their account.
 * 2. Customer registers and creates a shipping address.
 * 3. Seller registers, creates a product, creates two variants, and restocks both.
 * 4. Customer adds both variants to cart and places the order — both items become 'paid'.
 * 5. Seller ships only variant 1, customer confirms delivery — variant 1 becomes 'delivered', variant 2 stays 'paid'.
 * 6. Administrator force-cancels the order — variant 2 is cancelled, variant 1 remains delivered.
 * 7. Validates statuses, status logs, inventory records, and overall order status.
 */
export async function test_api_administrator_force_cancel_order_mixed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  // 2. Customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 5. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 6. Seller creates variant 1 (V1-MIX, color: Red)
  const variant1 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "V1-MIX",
          options: [{ key: "color", value: "Red" }],
        },
      },
    );
  typia.assert(variant1);
  // 7. Seller creates variant 2 (V2-MIX, color: Blue)
  const variant2 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "V2-MIX",
          options: [{ key: "color", value: "Blue" }],
        },
      },
    );
  typia.assert(variant2);
  // 8. Restock variant 1 (quantity_change=10)
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant1.id },
      body: { quantity_change: 10, reason: "initial restock" },
    },
  );
  // 9. Restock variant 2 (quantity_change=10)
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant2.id },
      body: { quantity_change: 10, reason: "initial restock" },
    },
  );
  // 10. Customer adds variant 1 to cart (quantity=2)
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant1.id,
        quantity: 2,
      },
    },
  );
  // 11. Customer adds variant 2 to cart (quantity=1)
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant2.id,
        quantity: 1,
      },
    },
  );
  // 12. Customer places the order — both items become 'paid'
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: { addressId: address.id },
    },
  );
  typia.assert(order);
  // Find order items by variant ID
  const orderItem1 = order.orderItems.find(
    (item: IECommerceMallOrderItem) => item.productVariant.id === variant1.id,
  )!;
  const orderItem2 = order.orderItems.find(
    (item: IECommerceMallOrderItem) => item.productVariant.id === variant2.id,
  )!;
  // 13. Seller creates a shipment containing only variant 1
  //     variant 1 transitions from 'paid' to 'shipped'
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem1.id],
        },
      },
    );
  typia.assert(shipment);
  // 14. Customer confirms delivery of the shipment
  //     variant 1 transitions from 'shipped' to 'delivered'
  //     variant 2 remains 'paid'
  const deliveredShipment =
    await api.functional.eCommerceMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  // 15. Administrator force-cancels the entire order
  const forceCancelled =
    await api.functional.eCommerceMall.administrator.orders.force_cancel.forceCancel(
      adminConnection,
      {
        orderCode: order.code,
      },
    );
  typia.assert(forceCancelled);
  // 16. Validate results
  const resultItem1 = forceCancelled.orderItems.find(
    (item: IECommerceMallOrderItem) => item.id === orderItem1.id,
  )!;
  const resultItem2 = forceCancelled.orderItems.find(
    (item: IECommerceMallOrderItem) => item.id === orderItem2.id,
  )!;
  // Variant 1 (delivered) remains 'delivered'
  TestValidator.equals(
    "variant 1 status remains delivered",
    "delivered",
    resultItem1.status,
  );
  // Variant 2 (paid) is now 'cancelled'
  TestValidator.equals(
    "variant 2 status changed to cancelled",
    "cancelled",
    resultItem2.status,
  );
  // Order total_price remains unchanged
  TestValidator.equals(
    "order total price unchanged",
    order.totalPrice,
    forceCancelled.totalPrice,
  );
  // Status log for variant 2: from_status='paid', to_status='cancelled',
  // reason='administrator_force_cancel'
  const cancelLog = resultItem2.statusLogs.find(
    (log: IECommerceMallOrderItemStatusLog) => log.to_status === "cancelled",
  )!;
  TestValidator.equals("cancel log from_status", "paid", cancelLog.from_status);
  TestValidator.equals(
    "cancel log reason",
    "administrator_force_cancel",
    cancelLog.reason,
  );
  // Variant 1 has no status log for force-cancel
  const deliveredForceCancelLog = resultItem1.statusLogs.find(
    (log: IECommerceMallOrderItemStatusLog) =>
      log.reason === "administrator_force_cancel",
  );
  if (deliveredForceCancelLog !== undefined) {
    throw new Error("Variant 1 should not have a force-cancel log");
  }
  // Overall derived order status is 'partially_completed'
  TestValidator.equals(
    "overall order status is partially_completed",
    "partially_completed",
    resultItem1.order.status,
  );
}
