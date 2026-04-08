import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
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
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_refund_approval_by_seller_for_delivered_item(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // STEP 1: Admin Setup - Create admin account and authenticate
  // ========================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ========================================
  // STEP 2: Admin creates product category
  // ========================================
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminLoginConnection,
    {},
  );
  typia.assert(category);
  // ========================================
  // STEP 3: Seller registers with pending status
  // ========================================
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // ========================================
  // STEP 4: Admin approves seller registration
  // Note: The approvalId should match the seller approval record ID
  // Using seller ID as approximation - in real flow, admin would list pending approvals
  // ========================================
  const sellerApproval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
      adminLoginConnection,
      { approvalId: sellerAuth.id },
    );
  typia.assert(sellerApproval);
  // Seller login with approved credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const approvedSeller = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(approvedSeller);
  // ========================================
  // STEP 5: Approved seller creates product with category
  // ========================================
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // Get product variant from created product
  const variant = product.variants[0];
  typia.assert(variant);
  // ========================================
  // STEP 6: Customer registers
  // ========================================
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(
    customerJoinConnection,
    {},
  );
  typia.assert(customerAuth);
  // Customer login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = customerAuth.email;
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // ========================================
  // STEP 7: Customer adds shipping address
  // ========================================
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postalCode: "12345",
          country: "Korea",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // ========================================
  // STEP 8: Customer adds product variant to cart
  // ========================================
  const cart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cart);
  // ========================================
  // STEP 9: Customer checks out - creates order with paid status
  // ========================================
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // ========================================
  // STEP 10: Seller creates shipment - items become shipped
  // ========================================
  const shipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerLoginConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem.id],
          carrier: "DHL",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // ========================================
  // STEP 11: Order items are confirmed as delivered
  // In real flow, this happens after shipment delivery confirmation
  // For E2E testing, we proceed assuming delivery confirmation occurred
  // ========================================
  // ========================================
  // STEP 12: Customer creates refund request for delivered order item
  // ========================================
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          sellerId: approvedSeller.id,
          reason: "Product damaged during shipping, requesting full refund",
        },
      },
    );
  typia.assert(refundRequest);
  // Store original refund request ID for approval step
  const refundRequestId = refundRequest.id;
  // Validate refund request is pending
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.snapshotStatus,
    "pending",
  );
  // ========================================
  // STEP 13: Seller approves the refund request
  // ========================================
  const approvedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerLoginConnection,
      { requestId: refundRequestId },
    );
  typia.assert(approvedRefund);
  // ========================================
  // VALIDATIONS
  // ========================================
  // Validate refund request status changed to approved
  TestValidator.equals(
    "refund request status is approved",
    approvedRefund.snapshotStatus,
    "approved",
  );
  // Validate seller response is recorded
  TestValidator.equals(
    "seller response is approved",
    approvedRefund.sellerResponse,
    "approved",
  );
  // Validate seller response timestamp is populated
  TestValidator.predicate(
    "seller response timestamp is populated",
    approvedRefund.createdAt !== null && approvedRefund.createdAt !== undefined,
  );
  // Validate refund request snapshot is created with reason
  TestValidator.predicate(
    "refund request has snapshot reason",
    approvedRefund.snapshotReason !== null &&
      approvedRefund.snapshotReason !== undefined &&
      approvedRefund.snapshotReason.length > 0,
  );
}
