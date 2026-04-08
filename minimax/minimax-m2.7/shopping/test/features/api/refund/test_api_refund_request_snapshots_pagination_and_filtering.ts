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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_ecommerce_mall_customer_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_me_cart_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_request_snapshots_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // STEP 1: Setup - Register seller and customer
  // ============================================================
  // Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Create and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "Qwerty1234!",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Create product with variant
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerLoginConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(product);
  // Get variant ID from product
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants");
  }
  // Add inventory to variant
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerLoginConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantityChange: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        reason: "restock",
      },
    },
  );
  // ============================================================
  // STEP 2: Customer adds to cart and places order
  // ============================================================
  // Customer adds item to cart
  const cart = await generate_random_ecommerce_mall_customer_me_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  typia.assert(cart);
  // Place order
  const shippingAddressId = customerAuth.shippingAddresses[0]?.id;
  if (!shippingAddressId) {
    throw new Error("Customer has no shipping address");
  }
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: shippingAddressId,
        },
      },
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order has no items");
  }
  // ============================================================
  // STEP 3: Ship order and confirm delivery
  // ============================================================
  // Seller creates shipment
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerLoginConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          carrier: "DHL",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          itemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // ============================================================
  // STEP 4: Create refund request and seller rejects
  // ============================================================
  // Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          reason: "Product not as described",
        },
      },
    );
  typia.assert(refundRequest);
  // Seller rejects refund with reason
  const rejectionReason = "Item matches description. No refund available.";
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.reject(
      sellerLoginConnection,
      {
        requestId: refundRequest.id,
        body: {
          reason: rejectionReason,
        },
      },
    );
  typia.assert(rejectedRequest);
  // ============================================================
  // STEP 5: Test pagination
  // ============================================================
  // Get snapshots with pagination (page 1, limit 5)
  const snapshotsPage1 =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        requestId: refundRequest.id,
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(snapshotsPage1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    snapshotsPage1.pagination !== null,
    true,
  );
  TestValidator.equals("page is 1", snapshotsPage1.pagination.current, 1);
  TestValidator.equals("limit is 5", snapshotsPage1.pagination.limit, 5);
  TestValidator.predicate(
    "has records count",
    snapshotsPage1.pagination.records >= 0,
  );
  // ============================================================
  // STEP 6: Test sorting (desc by created_at - newest first)
  // ============================================================
  // Get snapshots with explicit sort (descending)
  const snapshotsDesc =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        requestId: refundRequest.id,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(snapshotsDesc);
  // Validate descending order
  if (snapshotsDesc.data.length >= 2) {
    const firstDate = new Date(snapshotsDesc.data[0].createdAt);
    const secondDate = new Date(snapshotsDesc.data[1].createdAt);
    TestValidator.predicate(
      "newest snapshot first (desc sort)",
      firstDate >= secondDate,
    );
  }
  // Get snapshots with ascending sort for comparison
  const snapshotsAsc =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        requestId: refundRequest.id,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(snapshotsAsc);
  // Validate ascending order
  if (snapshotsAsc.data.length >= 2) {
    const firstDate = new Date(snapshotsAsc.data[0].createdAt);
    const secondDate = new Date(snapshotsAsc.data[1].createdAt);
    TestValidator.predicate(
      "oldest snapshot first (asc sort)",
      firstDate <= secondDate,
    );
  }
  // ============================================================
  // STEP 7: Test filtering by snapshotStatus
  // ============================================================
  // Filter by rejected status
  const rejectedSnapshots =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        requestId: refundRequest.id,
        body: {
          snapshotStatus: "rejected",
        },
      },
    );
  typia.assert(rejectedSnapshots);
  // All returned snapshots should have rejected status
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is rejected",
      snapshot.snapshotStatus,
      "rejected",
    );
  }
  // Filter by approved status (should return empty or different results)
  const approvedSnapshots =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        requestId: refundRequest.id,
        body: {
          snapshotStatus: "approved",
        },
      },
    );
  typia.assert(approvedSnapshots);
  // ============================================================
  // STEP 8: Validate snapshot content
  // ============================================================
  // Get all snapshots to validate content
  const allSnapshots =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        requestId: refundRequest.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  // Find the rejection snapshot and validate fields
  const rejectionSnapshot = allSnapshots.data.find(
    (s) => s.snapshotStatus === "rejected" && s.sellerResponse === "rejected",
  );
  TestValidator.equals(
    "rejection snapshot exists",
    rejectionSnapshot !== null && rejectionSnapshot !== undefined,
    true,
  );
  // Validate sellerResponse is rejected
  TestValidator.equals(
    "sellerResponse is rejected",
    rejectionSnapshot?.sellerResponse ?? "",
    "rejected",
  );
  // Validate snapshotStatus is rejected
  TestValidator.equals(
    "snapshotStatus is rejected",
    rejectionSnapshot?.snapshotStatus ?? "",
    "rejected",
  );
  // Validate sellerResponseReason contains the rejection reason
  TestValidator.equals(
    "sellerResponseReason matches rejection",
    rejectionSnapshot?.sellerResponseReason ?? "",
    rejectionReason,
  );
  // Validate snapshotReason matches original customer reason
  TestValidator.equals(
    "snapshotReason matches customer reason",
    rejectionSnapshot?.snapshotReason ?? "",
    "Product not as described",
  );
  // Validate customer info is included
  TestValidator.equals(
    "customer info exists",
    rejectionSnapshot?.customer !== null &&
      rejectionSnapshot?.customer !== undefined,
    true,
  );
  // Validate seller info is included
  TestValidator.equals(
    "seller info exists",
    rejectionSnapshot?.seller !== null &&
      rejectionSnapshot?.seller !== undefined,
    true,
  );
  // Validate id is valid UUID
  TestValidator.predicate("snapshot has valid id", () => {
    if (!rejectionSnapshot) return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(rejectionSnapshot.id);
  });
  // Validate createdAt is valid datetime
  TestValidator.predicate("snapshot has valid createdAt", () => {
    if (!rejectionSnapshot) return false;
    const date = new Date(rejectionSnapshot.createdAt);
    return !isNaN(date.getTime());
  });
}
