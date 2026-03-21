import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_refund_snapshot_admin_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerAuth);
  // 3. Create product for the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  TestValidator.equals(
    "variant exists",
    variant !== null && variant !== undefined,
    true,
  );
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      href: "https://example.com/customer",
      referrer: "https://example.com",
    },
  });
  // 5. Create shipping address for customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"uint32">>()} Main Street`,
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "United States",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 6. Add product variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Checkout to create order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: `tok_test_${RandomGenerator.alphaNumeric(24)}`,
          address_id: address.id,
        },
      },
    );
  typia.assert(order);
  // Get the order item ID for shipping
  const orderItem = order.orderItems[0];
  TestValidator.equals(
    "order item exists",
    orderItem !== null && orderItem !== undefined,
    true,
  );
  // 8. Seller creates shipment
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: `TRACK${RandomGenerator.alphaNumeric(10)}`,
      },
    },
  );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Customer submits refund request
  const refundRequestResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(refundRequestResponse);
  // Find the refund request for our order item
  const refundRequest = refundRequestResponse.data.find(
    (req) => req.orderItem.id === orderItem.id && req.status === "pending",
  );
  TestValidator.equals(
    "refund request exists",
    refundRequest !== null && refundRequest !== undefined,
    true,
  );
  // 11. Seller approves refund request (creates snapshot)
  const approvedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        requestId: refundRequest!.id,
      },
    );
  typia.assert(approvedRefundRequest);
  // 12. Admin retrieves refund request snapshots with default sorting
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.refund_request_snapshots.index(
      adminLoginConnection,
      {
        body: {
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(snapshotsResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "has pagination",
    snapshotsResponse.pagination !== null &&
      snapshotsResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    snapshotsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    snapshotsResponse.pagination.pages >= 0,
  );
  // Validate we have at least one snapshot (from the approved refund)
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsResponse.data.length > 0,
  );
  // Validate snapshot structure
  const firstSnapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "has id",
    firstSnapshot.id !== null && firstSnapshot.id !== undefined,
    true,
  );
  TestValidator.equals(
    "has snapshot_reason",
    firstSnapshot.snapshot_reason !== null &&
      firstSnapshot.snapshot_reason !== undefined,
    true,
  );
  TestValidator.equals(
    "has snapshot_status",
    firstSnapshot.snapshot_status !== null &&
      firstSnapshot.snapshot_status !== undefined,
    true,
  );
  TestValidator.equals(
    "has seller_response",
    firstSnapshot.seller_response !== null &&
      firstSnapshot.seller_response !== undefined,
    true,
  );
  TestValidator.equals(
    "has created_at",
    firstSnapshot.created_at !== null && firstSnapshot.created_at !== undefined,
    true,
  );
  // Validate customer summary
  TestValidator.equals(
    "has customer summary",
    firstSnapshot.customer !== null && firstSnapshot.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "customer has id",
    firstSnapshot.customer.id !== null &&
      firstSnapshot.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "customer has email",
    firstSnapshot.customer.email !== null &&
      firstSnapshot.customer.email !== undefined,
    true,
  );
  // Validate refund request summary
  TestValidator.equals(
    "has refundRequest summary",
    firstSnapshot.refundRequest !== null &&
      firstSnapshot.refundRequest !== undefined,
    true,
  );
  TestValidator.equals(
    "refundRequest has id",
    firstSnapshot.refundRequest.id !== null &&
      firstSnapshot.refundRequest.id !== undefined,
    true,
  );
  TestValidator.equals(
    "refundRequest has status",
    firstSnapshot.refundRequest.status !== null &&
      firstSnapshot.refundRequest.status !== undefined,
    true,
  );
  // Validate seller summary
  TestValidator.equals(
    "has seller summary",
    firstSnapshot.seller !== null && firstSnapshot.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "seller has id",
    firstSnapshot.seller.id !== null && firstSnapshot.seller.id !== undefined,
    true,
  );
  TestValidator.equals(
    "seller has email",
    firstSnapshot.seller.email !== null &&
      firstSnapshot.seller.email !== undefined,
    true,
  );
  // Validate default sorting (newest first - created_at descending)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      const current = snapshotsResponse.data[i];
      const next = snapshotsResponse.data[i + 1];
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i + 1} created_at (descending sort)`,
        new Date(current.created_at) >= new Date(next.created_at),
      );
    }
  }
  // Verify the snapshot we created is in the list
  const ourSnapshot = snapshotsResponse.data.find(
    (s) => s.refundRequest.id === refundRequest!.id,
  );
  TestValidator.equals(
    "our snapshot is in the list",
    ourSnapshot !== null && ourSnapshot !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot_status is approved",
    ourSnapshot!.snapshot_status,
    "approved",
  );
  TestValidator.equals(
    "seller_response is approved",
    ourSnapshot!.seller_response,
    "approved",
  );
}
