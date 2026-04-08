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
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * E2E test for admin filtering refund request snapshots by seller response.
 *
 * Tests the admin endpoint for retrieving refund request snapshots filtered by seller response.
 * Validates that admins can filter snapshots by 'rejected' seller response and verify
 * snapshot data integrity including customer/seller summaries, rejection reasons, and timestamps.
 *
 * **Setup Flow:**
 * 1. Create and authenticate admin
 * 2. Create and approve seller
 * 3. Seller creates category, product with variants, and inventory
 * 4. Create customer with shipping address
 * 5. Customer adds to cart and places order
 * 6. Seller ships items
 * 7. Customer confirms delivery
 * 8. Customer creates refund request
 * 9. Seller rejects refund → creates snapshot with sellerResponse 'rejected'
 *
 * **Test Validation:**
 * - Response status is 200
 * - All snapshots have sellerResponse = 'rejected'
 * - sellerResponseReason is populated
 * - Customer summary matches refund initiator
 * - Seller summary matches responding seller
 * - SnapshotReason and snapshotStatus fields present
 * - createdAt timestamp is valid ISO format
 * - Pagination metadata is correct
 */
export async function test_api_admin_refund_snapshots_filter_by_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // 1. ADMIN SETUP - Create and authenticate admin
  // ============================================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ============================================================
  // 2. SELLER SETUP - Create pending seller
  // ============================================================
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnectionForJoin: api.IConnection = { host: connection.host };
  const pendingSeller = await authorize_seller_join(sellerConnectionForJoin, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // ============================================================
  // 3. ADMIN APPROVES SELLER
  // ============================================================
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: pendingSeller.id },
    );
  typia.assert(approvedSeller);
  // ============================================================
  // 4. SELLER CREATES CATEGORY AND PRODUCT
  // ============================================================
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerLoginConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants");
  }
  // ============================================================
  // 5. SELLER ADDS INVENTORY
  // ============================================================
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerLoginConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantityChange: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >() as number,
        reason: "Initial stock for testing",
      },
    },
  );
  // ============================================================
  // 6. CUSTOMER SETUP - Create customer with shipping address
  // ============================================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // ============================================================
  // 7. CUSTOMER ADDS TO CART AND PLACES ORDER
  // ============================================================
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >() as number,
        },
      },
    );
  typia.assert(cartItem);
  // Place order with shipping address
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: customerAuth.shippingAddresses[0]?.id,
        },
      },
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order has no items");
  }
  // ============================================================
  // 8. SELLER SHIPS THE ORDER
  // ============================================================
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerLoginConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          itemIds: [orderItem.id],
          carrier: "DHL Express",
          trackingNumber: "1234567890",
        },
      },
    );
  typia.assert(shipment);
  // ============================================================
  // 9. CUSTOMER CONFIRMS DELIVERY
  // ============================================================
  const shipmentSummary = shipment;
  await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipmentSummary.id,
    },
  );
  // ============================================================
  // 10. CUSTOMER CREATES REFUND REQUEST
  // ============================================================
  const refundRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          reason: "Product does not match description",
        },
      },
    );
  typia.assert(refundRequest);
  // ============================================================
  // 11. SELLER REJECTS REFUND REQUEST - Creates snapshot
  // ============================================================
  const rejectedRefund =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.reject(
      sellerLoginConnection,
      {
        requestId: refundRequest.id,
        body: {
          reason: "Item was exactly as described in the listing",
        },
      },
    );
  typia.assert(rejectedRefund);
  // ============================================================
  // 12. ADMIN FILTERS REFUND REQUEST SNAPSHOTS BY SELLER RESPONSE
  // ============================================================
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: refundRequest.id,
        body: {
          sellerResponse: "rejected",
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // ============================================================
  // 13. VALIDATE RESPONSE
  // ============================================================
  // Validate pagination structure
  TestValidator.equals(
    "has pagination",
    typeof snapshotsResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "has valid page data",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    snapshotsResponse.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate(
    "has snapshots data",
    Array.isArray(snapshotsResponse.data),
  );
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsResponse.data.length > 0,
  );
  // Validate all snapshots have sellerResponse = 'rejected'
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.equals(
      "snapshot sellerResponse is rejected",
      snapshot.sellerResponse,
      "rejected",
    );
    // Validate sellerResponseReason is populated
    TestValidator.predicate(
      "sellerResponseReason is present and non-empty",
      typeof snapshot.sellerResponseReason === "string" &&
        snapshot.sellerResponseReason.length > 0,
    );
    // Validate customer summary exists
    TestValidator.equals(
      "customer summary exists",
      typeof snapshot.customer,
      "object",
    );
    TestValidator.predicate(
      "customer has id",
      typeof snapshot.customer.id === "string",
    );
    // Validate seller summary exists
    TestValidator.equals(
      "seller summary exists",
      typeof snapshot.seller,
      "object",
    );
    TestValidator.predicate(
      "seller has id",
      typeof snapshot.seller.id === "string",
    );
    // Validate snapshot reason is preserved
    TestValidator.predicate(
      "snapshotReason is present",
      typeof snapshot.snapshotReason === "string" &&
        snapshot.snapshotReason.length > 0,
    );
    // Validate snapshot status is present
    TestValidator.predicate(
      "snapshotStatus is present",
      typeof snapshot.snapshotStatus === "string",
    );
    // Validate createdAt timestamp is valid ISO format
    TestValidator.predicate(
      "createdAt is valid ISO date-time",
      !isNaN(Date.parse(snapshot.createdAt)),
    );
  }
  // Validate first snapshot has correct seller ID (the seller who rejected)
  const firstSnapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "snapshot seller matches rejecting seller",
    firstSnapshot.seller.id,
    approvedSeller.id,
  );
  // Validate first snapshot has correct customer ID (the customer who requested refund)
  TestValidator.equals(
    "snapshot customer matches requesting customer",
    firstSnapshot.customer.id,
    customerAuth.id,
  );
}
