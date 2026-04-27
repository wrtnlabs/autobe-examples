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
import { generate_random_e_commerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_refund_requests_create";
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
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_request_rejection_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // STEP 1-4: SELLER SETUP
  // ============================================================
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // Create product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Restock variant with 10 units
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity_change: 10, reason: "initial restock" },
      },
    );
  typia.assert(inventoryRecord);
  // ============================================================
  // STEP 5-8: CUSTOMER SETUP AND PURCHASE
  // ============================================================
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  typia.assert(customerAuth);
  // Create shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Add variant to cart
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { product_variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // Place order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: { addressId: address.id },
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // ============================================================
  // STEP 9: SELLER CREATES SHIPMENT
  // ============================================================
  const sellerReConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerReConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IECommerceMallSeller.ILogin,
  });
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerReConnection,
      {
        body: {
          carrierName: "Test Carrier",
          trackingNumber: "TRACK-001",
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // ============================================================
  // STEP 10: CUSTOMER CONFIRMS DELIVERY
  // ============================================================
  const customerReConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerReConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IECommerceMallCustomer.ILogin,
  });
  const confirmedShipment =
    await api.functional.eCommerceMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerReConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  TestValidator.equals(
    "shipment delivered",
    confirmedShipment.delivered_at !== null,
    true,
  );
  // ============================================================
  // STEP 11: CUSTOMER CREATES REFUND REQUEST
  // ============================================================
  const refundReason = "Changed my mind - not satisfied with the product";
  const refundRequest =
    await generate_random_e_commerce_mall_customer_refund_requests_create(
      customerReConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request has null response_timestamp",
    refundRequest.response_timestamp,
    null,
  );
  // ============================================================
  // STEP 12-13: RECORD STOCK BEFORE REJECTION
  // ============================================================
  const stockBeforeRejection = refundRequest.orderItem.productVariant.stock;
  // ============================================================
  // STEP 14: SELLER REJECTS THE REFUND REQUEST
  // ============================================================
  const sellerRejectConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerRejectConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IECommerceMallSeller.ILogin,
  });
  const updatedRefundRequest =
    await api.functional.eCommerceMall.seller.refund_requests.update(
      sellerRejectConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "rejected",
        } satisfies IECommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // ============================================================
  // VERIFICATION
  // ============================================================
  // 1. Response has status='rejected' and response_timestamp set
  TestValidator.equals(
    "refund request status is rejected",
    updatedRefundRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "response_timestamp is set after rejection",
    updatedRefundRequest.response_timestamp !== null,
  );
  // 2. Snapshot validation
  TestValidator.equals(
    "exactly one snapshot created",
    updatedRefundRequest.refundRequestSnapshots.length,
    1,
  );
  const snapshot = updatedRefundRequest.refundRequestSnapshots[0];
  TestValidator.equals(
    "snapshot reason matches customer's original reason",
    snapshot.reason,
    refundReason,
  );
  TestValidator.equals(
    "snapshot status is rejected",
    snapshot.status,
    "rejected",
  );
  TestValidator.predicate(
    "snapshot has response_timestamp set",
    snapshot.response_timestamp !== null,
  );
  // 3. Order item status remains 'delivered'
  TestValidator.equals(
    "order item status remains delivered after rejection",
    updatedRefundRequest.orderItem.status,
    "delivered",
  );
  // 4. Stock is unchanged (no inventory adjustment on rejection)
  TestValidator.equals(
    "variant stock unchanged after rejection",
    updatedRefundRequest.orderItem.productVariant.stock,
    stockBeforeRejection,
  );
}
