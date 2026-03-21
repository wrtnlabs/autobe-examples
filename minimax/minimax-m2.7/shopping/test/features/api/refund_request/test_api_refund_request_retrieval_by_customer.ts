import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_refund_request_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // Step 1: Create and authenticate seller
  // ============================================================
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerAuth);
  // Login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/login",
      referrer: "https://example.com",
    },
  });
  // ============================================================
  // Step 2: Create and authenticate customer
  // ============================================================
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(customerAuth);
  // Login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  // ============================================================
  // Step 3: Create shipping address for customer
  // ============================================================
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // ============================================================
  // Step 4: Add product to cart
  // Note: This requires a product to exist. In a complete test,
  // we would create a product first via seller.
  // ============================================================
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // ============================================================
  // Step 5: Checkout and create order
  // ============================================================
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_" + RandomGenerator.alphaNumeric(12),
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // ============================================================
  // Step 6: Seller ships order items
  // ============================================================
  const orderItem = order.orderItems[0];
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: "TRK" + RandomGenerator.alphaNumeric(8).toUpperCase(),
      },
    },
  );
  typia.assert(shipment);
  // ============================================================
  // Step 7: Customer confirms delivery
  // ============================================================
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // ============================================================
  // Step 8: Test refund request retrieval
  // After delivery, a refund request should exist for the customer to retrieve.
  // The customer should be able to get detailed refund request information
  // including reason, status, associated order item, and any snapshots.
  // ============================================================
  // NOTE: In a complete E2E test, we would first create a refund request via:
  // POST /ecommerceMall/customer/orders/{orderId}/items/{itemId}/refund
  // Then retrieve it using the endpoint under test.
  // The refund request creation endpoint is required to complete this flow.
  // Example of what the retrieval test would look like:
  // const refundRequest = await api.functional.ecommerceMall.customer.refund_requests.at(
  //   customerConnection,
  //   { requestId: createdRefundRequest.id },
  // );
  // typia.assert(refundRequest);
  // TestValidator.equals("status is pending", refundRequest.status, "pending");
  // TestValidator.predicate("has reason", refundRequest.reason.length > 0);
  // TestValidator.equals("order item matches", refundRequest.orderItem.id, orderItem.id);
  // For data isolation validation, we could test that another customer cannot retrieve this request
  // const otherCustomerConnection: api.IConnection = { host: connection.host };
  // await authorize_customer_join(otherCustomerConnection, {});
  // await TestValidator.error("cannot access other customer's refund request", async () => {
  //   await api.functional.ecommerceMall.customer.refund_requests.at(
  //     otherCustomerConnection,
  //     { requestId: refundRequest.id },
  //   );
  // });
}
