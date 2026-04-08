import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that an approved seller can view all refund requests from customers.
 *
 * This E2E test validates the complete refund workflow including seller approval,
 * product creation, order placement, shipment, delivery confirmation, and refund
 * request creation. Finally, it verifies that the seller can retrieve a paginated
 * list of all refund requests with complete customer and order item information.
 *
 * The test follows this workflow:
 * 1. Register seller → Admin approves → Create product
 * 2. Customer registers → Adds to cart → Completes checkout
 * 3. Seller ships → Customer confirms delivery → Customer requests refund
 * 4. Seller lists refund requests → Validates response structure and data
 */
export async function test_api_refund_requests_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Generate seller password for later re-authentication
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerAuth);
  // 2. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 4. Re-authenticate as approved seller using the stored password
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 5. Create a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      approvedSellerConnection,
      {},
    );
  typia.assert(product);
  // 6. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 7. Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 8. Customer completes checkout
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 9. Seller creates shipment
  const orderItem = order.orderItems[0];
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      approvedSellerConnection,
      {
        params: { itemId: orderItem.id },
      },
    );
  typia.assert(shipment);
  // 10. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { orderId: order.id, shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  // 11. Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
      },
    );
  typia.assert(refundRequest);
  // 12. Seller views all refund requests
  const refundRequestsPage =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.get(
      approvedSellerConnection,
    );
  typia.assert(refundRequestsPage);
  // Validate response structure
  TestValidator.equals(
    "has pagination",
    refundRequestsPage.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(refundRequestsPage.data),
    true,
  );
  TestValidator.predicate(
    "has at least one refund request",
    refundRequestsPage.data.length >= 1,
  );
  // Validate refund request summary contains required fields
  const firstRefund = refundRequestsPage.data[0];
  TestValidator.equals("has id", firstRefund.id !== undefined, true);
  TestValidator.equals("has reason", firstRefund.reason !== undefined, true);
  TestValidator.equals("has status", firstRefund.status !== undefined, true);
  TestValidator.equals(
    "has createdAt",
    firstRefund.createdAt !== undefined,
    true,
  );
  // Validate customer information is present
  TestValidator.equals(
    "has customer",
    firstRefund.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "has customer email",
    firstRefund.customer.email !== undefined,
    true,
  );
  TestValidator.equals(
    "has customer profile",
    firstRefund.customer.profile !== undefined,
    true,
  );
  TestValidator.equals(
    "has customer display_name",
    firstRefund.customer.profile.display_name !== undefined,
    true,
  );
  // Validate order item details are present
  TestValidator.equals(
    "has orderItem",
    firstRefund.orderItem !== undefined,
    true,
  );
  TestValidator.equals(
    "has orderItem quantity",
    firstRefund.orderItem.quantity !== undefined,
    true,
  );
  TestValidator.equals(
    "has orderItem unit_price",
    firstRefund.orderItem.unit_price !== undefined,
    true,
  );
  TestValidator.equals(
    "has orderItem status",
    firstRefund.orderItem.status !== undefined,
    true,
  );
  // Validate product snapshot in order item
  TestValidator.equals(
    "has productSnapshot",
    firstRefund.orderItem.productSnapshot !== undefined,
    true,
  );
  TestValidator.equals(
    "has productSnapshot name",
    firstRefund.orderItem.productSnapshot.name !== undefined,
    true,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination has current",
    refundRequestsPage.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    refundRequestsPage.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    refundRequestsPage.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    refundRequestsPage.pagination.pages !== undefined,
    true,
  );
  TestValidator.predicate(
    "records count is positive",
    refundRequestsPage.pagination.records > 0,
  );
  // Verify the refund request reason matches what customer submitted
  TestValidator.equals(
    "refund reason matches",
    firstRefund.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "refund status is pending",
    firstRefund.status,
    "pending",
  );
}
