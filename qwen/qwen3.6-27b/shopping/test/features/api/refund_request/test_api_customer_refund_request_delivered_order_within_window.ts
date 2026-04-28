import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_refund_requests_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_refund_request } from "../../../prepare/prepare_random_ecommerce_platform_refund_request";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test customer refund request creation for a delivered order item within the 7-day refund window.
 *
 * Validates the complete refund request flow including administrative category setup, seller approval and product creation, customer order placement, shipment dispatch, delivery confirmation, and refund request submission. Ensures that the refund request is created with 'pending' status, the order item has 'delivered' status, and the seller profile is correctly auto-derived through the product ownership chain.
 *
 * Special attention is given to verifying that the order item belongs to the authenticated customer, the order item status is 'delivered', and the refund reason is preserved in the response.
 *
 * 1. Administrator registers and creates a product category for product assignment.
 * 2. Seller registers with shop profile information.
 * 3. Administrator approves the seller application.
 * 4. Seller creates a product in the assigned category and a variant with SKU.
 * 5. Customer registers and creates a shipping address for order delivery.
 * 6. Customer places an order containing the product variant.
 * 7. Seller creates a shipment to dispatch the order item.
 * 8. Customer confirms delivery to transition item to 'delivered' status.
 * 9. Customer submits a refund request for the delivered order item.
 * 10. Validates refund request: status is 'pending', order item status is 'delivered', seller profile is auto-derived.
 */
export async function test_api_customer_refund_request_delivered_order_within_window(
  connection: api.IConnection,
): Promise<void> {
  // Admin credentials and connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies IEcommercePlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinBody });
  // Admin creates category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // Seller credentials and connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: sellerHref,
    referrer: sellerReferrer,
  } satisfies IEcommercePlatformSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  // Admin approves seller - need to get the seller approval request ID
  // First login as admin (use stored credentials)
  const adminLoginConn: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConn, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // Admin approves the seller - seller approval request is auto-created on join
  // The approval request is created during seller join
  // For E2E testing, we need the requestId which should be derivable
  const sellerApprovalRequestId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminLoginConn,
    {
      requestId: sellerApprovalRequestId,
      body: {
        status: "approved",
        reason: null,
      } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
    },
  );
  // Seller creates product
  const sellerLoginConn: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConn, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConn,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // Seller creates product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerLoginConn,
      {
        params: { productId: product.id },
        body: undefined,
      },
    );
  typia.assert(variant);
  // Customer credentials and connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  // Customer creates shipping address
  const customerLoginConn: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConn, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  const shippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerLoginConn,
      {},
    );
  typia.assert(shippingAddress);
  // Customer creates order with product variant
  const orderItemPrice: number =
    variant.price != null ? variant.price : product.base_price;
  const orderItems: IEcommercePlatformOrderItem.ICreate[] & tags.MinItems<1> = [
    {
      ecommerce_platform_product_variant_id: variant.id,
      quantity: 1,
      price: orderItemPrice,
    } satisfies IEcommercePlatformOrderItem.ICreate,
  ];
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerLoginConn,
    {
      body: {
        items: orderItems,
        shipping_address_id: shippingAddress.id,
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID for shipment and later refund request
  const orderItemId = order.items[0].id;
  // Seller creates shipment
  const sellerShipmentConn: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerShipmentConn, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerShipmentConn,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(16),
          orderItemIds: [orderItemId],
        },
      },
    );
  typia.assert(shipment);
  // Customer confirms delivery
  const customerConfirmConn: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConfirmConn, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  const confirmedShipment =
    await api.functional.ecommercePlatform.customer.shipments.confirm(
      customerConfirmConn,
      {
        shipmentId: shipment.id,
        body: {} satisfies IEcommercePlatformShipment.IConfirm,
      },
    );
  typia.assert(confirmedShipment);
  // Verify delivery confirmation updated the shipment
  TestValidator.predicate(
    "confirmed_at timestamp is set",
    confirmedShipment.confirmed_at !== null,
  );
  TestValidator.predicate(
    "delivered_at timestamp is set",
    confirmedShipment.delivered_at !== null,
  );
  // Customer creates refund request for delivered order item
  const customerRefundConn: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerRefundConn, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  const refundBody = {
    order_item_id: orderItemId,
    refund_reason: "Product had quality issues upon delivery",
  } satisfies IEcommercePlatformRefundRequest.ICreate;
  const refund =
    await api.functional.ecommercePlatform.customer.refund_requests.create(
      customerRefundConn,
      { body: refundBody },
    );
  typia.assert(refund);
  // Validate refund request response
  TestValidator.equals("refund status is pending", refund.status, "pending");
  TestValidator.equals(
    "refund reason matches",
    refund.refundReason,
    refundBody.refund_reason,
  );
  TestValidator.equals(
    "order item belongs to refund",
    refund.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "order item status is delivered",
    refund.orderItem.status,
    "delivered",
  );
  TestValidator.predicate(
    "seller profile is auto-derived with valid shop",
    refund.sellerProfile.shop_name.length > 0,
  );
}
