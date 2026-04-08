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
 * Test admin retrieves paginated refund request snapshots with default pagination settings.
 *
 * Validates the complete refund workflow including seller approval which creates immutable snapshots.
 * This test verifies that administrators can access paginated refund request snapshots through
 * the admin API endpoint, validating pagination metadata, snapshot data integrity, and proper
 * relationship joins between customers and sellers.
 *
 * 1. Admin authenticates to access admin endpoints.
 * 2. Seller registers and gets approved to sell products.
 * 3. Customer registers and completes a purchase workflow.
 * 4. Order goes through shipment and delivery confirmation.
 * 5. Customer requests refund for delivered item.
 * 6. Seller approves refund, creating an immutable snapshot.
 * 7. Admin retrieves paginated snapshots and validates response structure.
 */
export async function test_api_admin_refund_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - register and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Admin approves seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: seller.id,
    },
  );
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Admin creates category
  const category =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 5. Seller creates product with variant
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Get variant from product
  const variant = product.variants[0];
  typia.assert(variant);
  // 6. Seller adds inventory
  await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(
    sellerConnection,
    {
      variantId: variant.id,
      body: {
        quantityChange: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        reason: "Initial stock for testing",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 7. Customer adds to cart and checks out
  const cartItem =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(cartItem);
  // Create shipping address for customer
  const shippingAddress = customer.shippingAddresses[0];
  // Place order
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerConnection,
      {
        body: {
          shippingAddressId: shippingAddress.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Get order item for shipment and refund
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 8. Seller creates shipment
  const shipment =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.ship.create(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          carrier: "Test Carrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          itemIds: [orderItem.id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 10. Customer creates refund request
  const refundRequest =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.refund.create(
      customerConnection,
      {
        itemId: orderItem.id,
        body: {
          reason: "Product not as expected - requesting refund",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 11. Seller approves refund (creates snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.approve(
      sellerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  // 12. Admin retrieves paginated snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: refundRequest.id,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "has pagination",
    snapshotsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", snapshotsResponse.pagination.limit, 20);
  TestValidator.predicate(
    "has records",
    snapshotsResponse.pagination.records >= 1,
  );
  TestValidator.predicate("has pages", snapshotsResponse.pagination.pages >= 1);
  // Validate snapshots data
  TestValidator.predicate(
    "has snapshots data",
    snapshotsResponse.data.length >= 1,
  );
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  // Validate snapshot structure
  TestValidator.equals("has id", snapshot.id !== undefined, true);
  TestValidator.equals(
    "has snapshotReason",
    snapshot.snapshotReason !== undefined,
    true,
  );
  TestValidator.equals(
    "has snapshotStatus",
    snapshot.snapshotStatus !== undefined,
    true,
  );
  TestValidator.equals(
    "has sellerResponse",
    snapshot.sellerResponse !== undefined,
    true,
  );
  TestValidator.equals("has createdAt", snapshot.createdAt !== undefined, true);
  // Validate customer relationship
  TestValidator.equals(
    "has customer info",
    snapshot.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "customer has id",
    snapshot.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "customer has email",
    snapshot.customer.email !== undefined,
    true,
  );
  // Validate seller relationship
  TestValidator.equals("has seller info", snapshot.seller !== undefined, true);
  TestValidator.equals("seller has id", snapshot.seller.id !== undefined, true);
  TestValidator.equals(
    "seller has email",
    snapshot.seller.email !== undefined,
    true,
  );
  // Verify snapshot reflects seller approval state
  TestValidator.equals(
    "snapshotStatus is approved",
    snapshot.snapshotStatus,
    "approved",
  );
  TestValidator.equals(
    "sellerResponse is approved",
    snapshot.sellerResponse,
    "approved",
  );
  TestValidator.equals(
    "snapshotReason matches refund reason",
    snapshot.snapshotReason,
    "Product not as expected - requesting refund",
  );
  // Verify ordering (newest first)
  if (snapshotsResponse.data.length > 1) {
    const firstDate = new Date(snapshotsResponse.data[0].createdAt).getTime();
    const secondDate = new Date(snapshotsResponse.data[1].createdAt).getTime();
    TestValidator.predicate("snapshots ordered desc", firstDate >= secondDate);
  }
}
