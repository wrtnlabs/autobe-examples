import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test that a customer can view full order item details after the complete lifecycle: paid → shipped → delivered.
 *
 * Validates the entire order item detail response including status history with three log entries, shipment tracking information, product-variant snapshot, seller snapshot, and the absence of cancellation/refund/review records when none were created.
 *
 * The test orchestrates a multi-actor flow: the customer creates an address, the seller sets up a product with a variant and inventory, the customer purchases and confirms delivery, then the order item detail is retrieved and validated.
 *
 * 1. Customer joins and creates a shipping address.
 * 2. Seller joins, creates a product with a variant, and restocks inventory.
 * 3. Customer adds the variant to the cart and places an order (status = 'paid').
 * 4. Seller creates a shipment with the paid order item (status = 'shipped').
 * 5. Customer confirms delivery of the shipment (status = 'delivered').
 * 6. Customer retrieves the order item detail via GET /eCommerceMall/customer/orders/{orderCode}/items/{itemId}.
 * 7. Validates the response against all expected fields and business rules.
 */
export async function test_api_order_item_view_by_customer_after_delivery(
  connection: api.IConnection,
): Promise<void> {
  // ---- Actor-specific connections ----
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // ---- Step 1: Customer joins and creates address ----
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // ---- Step 2: Seller joins, creates product, variant, restocks ----
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // ---- Step 3: Customer adds variant to cart and places order ----
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0]!;
  // ---- Step 4: Seller creates shipment (status becomes 'shipped') ----
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // ---- Step 5: Customer confirms delivery (status becomes 'delivered') ----
  const updatedShipment =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(updatedShipment);
  // ---- Step 6: Retrieve order item detail ----
  const detail = await api.functional.eCommerceMall.customer.orders.items.at(
    customerConnection,
    {
      orderCode: order.code,
      itemId: orderItem.id,
    },
  );
  typia.assert(detail);
  // ---- Step 7: Business logic validations ----
  TestValidator.equals("status is delivered", detail.status, "delivered");
  // Status logs: exactly 3 entries in chronological order
  const logs = detail.statusLogs;
  TestValidator.equals("status logs count", logs.length, 3);
  TestValidator.equals("log[0] from null to paid", logs[0].from_status, null);
  TestValidator.equals("log[0] to_status paid", logs[0].to_status, "paid");
  TestValidator.equals(
    "log[1] from paid to shipped",
    logs[1].from_status,
    "paid",
  );
  TestValidator.equals(
    "log[1] to_status shipped",
    logs[1].to_status,
    "shipped",
  );
  TestValidator.equals(
    "log[1] reason shipment_created",
    logs[1].reason,
    "shipment_created",
  );
  TestValidator.equals(
    "log[2] from shipped to delivered",
    logs[2].from_status,
    "shipped",
  );
  TestValidator.equals(
    "log[2] to_status delivered",
    logs[2].to_status,
    "delivered",
  );
  TestValidator.equals(
    "log[2] reason customer_delivery_confirmation",
    logs[2].reason,
    "customer_delivery_confirmation",
  );
  // Shipment tracking info
  const shipInfo = detail.shipment!;
  typia.assert(shipInfo);
  TestValidator.predicate(
    "shipped_at before delivered_at",
    () =>
      new Date(shipInfo.shipped_at).getTime() <
      new Date(shipInfo.delivered_at!).getTime(),
  );
  // Cancellation, refund, and review are all null
  TestValidator.equals(
    "cancellationRequest is null",
    detail.cancellationRequest,
    null,
  );
  TestValidator.equals("refundRequest is null", detail.refundRequest, null);
  TestValidator.equals("review is null", detail.review, null);
}
