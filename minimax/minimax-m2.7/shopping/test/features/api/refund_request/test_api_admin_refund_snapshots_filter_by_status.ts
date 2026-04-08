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

export async function test_api_admin_refund_snapshots_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  typia.assert(admin);
  // 2. Create and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  typia.assert(seller);
  // Approve seller by admin
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: seller.id },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 3. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/customer",
      referrer: "https://example.com",
    },
  });
  typia.assert(customer);
  // 4. Create category
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
  // 5. Seller creates product with variants
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
  // Add inventory to first variant (for first order item - approved refund)
  const variant1 = product.variants[0];
  const inventory1 =
    await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(
      sellerConnection,
      {
        variantId: variant1.id,
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          reason: "Initial stock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory1);
  // Add inventory to second variant (for second order item - pending refund)
  const variant2 = product.variants[1];
  const inventory2 =
    await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(
      sellerConnection,
      {
        variantId: variant2.id,
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          reason: "Initial stock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory2);
  // 6. Customer adds items to cart and creates order
  const cartItem1 =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerConnection,
      {
        body: {
          variantId: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(cartItem2);
  // Create order
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerConnection,
      {
        body: {
          shippingAddressId: customer.shippingAddresses[0].id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Get order items
  const orderItem1 = order.orderItems.find(
    (item) =>
      item.productSnapshot.productId === product.id &&
      item.productVariant.id === variant1.id,
  )!;
  const orderItem2 = order.orderItems.find(
    (item) =>
      item.productSnapshot.productId === product.id &&
      item.productVariant.id === variant2.id,
  )!;
  TestValidator.predicate(
    "order has items",
    orderItem1 !== undefined && orderItem2 !== undefined,
  );
  // 7. Seller ships order items
  const shipment1 =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.ship.create(
      sellerConnection,
      {
        itemId: orderItem1.id,
        body: {
          carrier: "DHL",
          trackingNumber: "DHL123456789",
          itemIds: [orderItem1.id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  const shipment2 =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.ship.create(
      sellerConnection,
      {
        itemId: orderItem2.id,
        body: {
          carrier: "FedEx",
          trackingNumber: "FX987654321",
          itemIds: [orderItem2.id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // 8. Customer confirms delivery
  await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment1.id,
    },
  );
  await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment2.id,
    },
  );
  // 9. Customer creates first refund request (will be approved)
  const refundRequest1 =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.refund.create(
      customerConnection,
      {
        itemId: orderItem1.id,
        body: {
          reason: "Product quality not as expected",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest1);
  // 10. Seller approves first refund → creates 'approved' snapshot
  const approvedRefund1 =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.approve(
      sellerConnection,
      { requestId: refundRequest1.id },
    );
  typia.assert(approvedRefund1);
  TestValidator.equals("refund 1 approved", approvedRefund1.status, "approved");
  // 11. Customer creates second refund request (pending)
  const refundRequest2 =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.refund.create(
      customerConnection,
      {
        itemId: orderItem2.id,
        body: {
          reason: "Changed my mind",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest2);
  // ============================================================
  // TEST: Filter by 'approved' status
  // ============================================================
  const approvedSnapshotsPage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: refundRequest1.id,
        body: {
          snapshotStatus: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshotsPage);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    approvedSnapshotsPage.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current is 1",
    approvedSnapshotsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    approvedSnapshotsPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    approvedSnapshotsPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    approvedSnapshotsPage.pagination.pages >= 1,
  );
  TestValidator.predicate("has data", approvedSnapshotsPage.data.length > 0);
  // Validate all returned snapshots have snapshotStatus = 'approved'
  for (const snapshot of approvedSnapshotsPage.data) {
    TestValidator.equals(
      "snapshot status is approved",
      snapshot.snapshotStatus,
      "approved",
    );
    TestValidator.equals(
      "sellerResponseReason is null for approved",
      snapshot.sellerResponseReason,
      null,
    );
    TestValidator.equals(
      "sellerResponse is approved",
      snapshot.sellerResponse,
      "approved",
    );
    TestValidator.predicate(
      "customer info exists",
      snapshot.customer !== undefined,
    );
    TestValidator.predicate(
      "seller info exists",
      snapshot.seller !== undefined,
    );
  }
  // ============================================================
  // TEST: Filter by 'pending' status
  // ============================================================
  const pendingSnapshotsPage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: refundRequest2.id,
        body: {
          snapshotStatus: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshotsPage);
  TestValidator.predicate(
    "pending pagination exists",
    pendingSnapshotsPage.pagination !== undefined,
  );
  for (const snapshot of pendingSnapshotsPage.data) {
    TestValidator.equals(
      "snapshot status is pending",
      snapshot.snapshotStatus,
      "pending",
    );
    TestValidator.equals(
      "sellerResponseReason is null for pending",
      snapshot.sellerResponseReason,
      null,
    );
    TestValidator.equals(
      "sellerResponse is null for pending",
      snapshot.sellerResponse,
      null,
    );
  }
  // ============================================================
  // TEST: Filter by 'rejected' status (should return empty)
  // ============================================================
  const rejectedSnapshotsPage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: refundRequest2.id,
        body: {
          snapshotStatus: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshotsPage);
  TestValidator.equals(
    "no rejected snapshots",
    rejectedSnapshotsPage.data.length,
    0,
  );
  // ============================================================
  // TEST: Filter without status filter (all snapshots)
  // ============================================================
  const allSnapshotsPage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: refundRequest1.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsPage);
  TestValidator.predicate(
    "has approved snapshots",
    allSnapshotsPage.data.length >= 1,
  );
  for (const snapshot of allSnapshotsPage.data) {
    TestValidator.equals(
      "snapshotReason matches original",
      snapshot.snapshotReason,
      "Product quality not as expected",
    );
  }
}
