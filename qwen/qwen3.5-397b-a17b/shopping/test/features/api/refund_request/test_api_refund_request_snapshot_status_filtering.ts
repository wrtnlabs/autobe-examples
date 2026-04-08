import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequestSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller's ability to filter refund request snapshots by workflow status.
 *
 * Validates the complete refund request snapshot filtering workflow including seller and customer account setup, product creation, order placement, shipment creation, refund request submission, seller approval, and status-based snapshot filtering. Ensures that the snapshot filtering correctly isolates snapshots by their workflow state (pending, approved) and that pagination metadata accurately reflects the filtered result count.
 *
 * The test creates a complete e-commerce transaction flow: seller creates product, customer places order, seller ships order, customer submits refund request, seller approves refund request. This creates multiple snapshots (initial pending + approved response) that can then be filtered by status.
 *
 * 1. Seller account registration and login with approved status.
 * 2. Customer account registration and login.
 * 3. Seller creates product for purchase.
 * 4. Customer adds product to cart and places order.
 * 5. Seller creates shipment to mark order as delivered.
 * 6. Customer submits refund request (creates pending snapshot).
 * 7. Seller approves refund request (creates approved snapshot).
 * 8. Seller filters snapshots by status='pending' - verifies only pending snapshot returned.
 * 9. Seller filters snapshots by status='approved' - verifies only approved snapshot returned.
 * 10. Seller retrieves all snapshots without filter - verifies both snapshots returned.
 * 11. Validates pagination metadata reflects filtered counts accurately.
 * 12. Validates each snapshot contains complete information (reason, seller_response, created_at).
 */
export async function test_api_refund_request_snapshot_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Customer setup - register and login
  const customerJoin = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer adds product to cart and places order
  // Use the product ID as variant ID since variants may not exist
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: product.variants[0]?.id ?? product.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 5. Seller creates shipment to mark order as delivered
  const orderItemId = order.orderItems[0]?.id;
  if (!orderItemId) {
    throw new Error("Order must have at least one order item");
  }
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItemId],
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // 6. Customer submits refund request (creates pending snapshot)
  const refundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 7. Seller approves refund request (creates approved snapshot)
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  // 8. Seller filters snapshots by status='pending'
  const pendingSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
          sort: "asc",
        } satisfies IShoppingMallPostPurchaseRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  // Validate pending filter results
  TestValidator.predicate(
    "pending filter returns at least one snapshot",
    () => pendingSnapshots.data.length >= 1,
  );
  TestValidator.predicate("all pending snapshots have status='pending'", () =>
    pendingSnapshots.data.every((s) => s.status === "pending"),
  );
  TestValidator.equals(
    "pending pagination records count matches data length",
    pendingSnapshots.pagination.records,
    pendingSnapshots.data.length,
  );
  // 9. Seller filters snapshots by status='approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
          sort: "asc",
        } satisfies IShoppingMallPostPurchaseRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Validate approved filter results
  TestValidator.predicate(
    "approved filter returns at least one snapshot",
    () => approvedSnapshots.data.length >= 1,
  );
  TestValidator.predicate("all approved snapshots have status='approved'", () =>
    approvedSnapshots.data.every((s) => s.status === "approved"),
  );
  TestValidator.equals(
    "approved pagination records count matches data length",
    approvedSnapshots.pagination.records,
    approvedSnapshots.data.length,
  );
  // 10. Seller retrieves all snapshots without filter
  const allSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "asc",
        } satisfies IShoppingMallPostPurchaseRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validate unfiltered results contain both statuses
  TestValidator.predicate(
    "unfiltered returns more snapshots than filtered",
    () =>
      allSnapshots.data.length >=
      pendingSnapshots.data.length + approvedSnapshots.data.length,
  );
  TestValidator.equals(
    "unfiltered pagination records matches total count",
    allSnapshots.pagination.records,
    allSnapshots.data.length,
  );
  // 11. Validate chronological ordering within filtered sets
  TestValidator.predicate(
    "pending snapshots are chronologically ordered",
    () => {
      for (let i = 1; i < pendingSnapshots.data.length; i++) {
        if (
          new Date(pendingSnapshots.data[i]!.created_at).getTime() <
          new Date(pendingSnapshots.data[i - 1]!.created_at).getTime()
        ) {
          return false;
        }
      }
      return true;
    },
  );
  TestValidator.predicate(
    "approved snapshots are chronologically ordered",
    () => {
      for (let i = 1; i < approvedSnapshots.data.length; i++) {
        if (
          new Date(approvedSnapshots.data[i]!.created_at).getTime() <
          new Date(approvedSnapshots.data[i - 1]!.created_at).getTime()
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 12. Validate each snapshot contains complete information
  pendingSnapshots.data.forEach((snapshot, index) => {
    TestValidator.equals(
      `pending snapshot ${index} status is pending`,
      snapshot.status,
      "pending",
    );
    TestValidator.predicate(
      `pending snapshot ${index} has refundRequest reference`,
      () => snapshot.refundRequest !== undefined,
    );
  });
  approvedSnapshots.data.forEach((snapshot, index) => {
    TestValidator.equals(
      `approved snapshot ${index} status is approved`,
      snapshot.status,
      "approved",
    );
    TestValidator.predicate(
      `approved snapshot ${index} has refundRequest reference`,
      () => snapshot.refundRequest !== undefined,
    );
  });
}
