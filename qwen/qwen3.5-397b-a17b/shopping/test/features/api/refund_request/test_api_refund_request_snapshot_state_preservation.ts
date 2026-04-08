import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test refund request snapshot state preservation for audit trail integrity.
 *
 * Validates that refund request snapshots preserve immutable state at each transition point, forming a complete audit trail from submission to resolution. The test verifies that customer reason text remains identical across all snapshots, status transitions are accurately captured, and seller response data is properly recorded.
 *
 * The test establishes a complete e-commerce workflow including administrator category creation, seller product listing, member order placement, shipment delivery, and refund request processing. Each snapshot captures the exact state of the refund request at the moment of creation, ensuring data integrity for dispute resolution and compliance auditing.
 *
 * 1. Administrator creates category for product organization.
 * 2. Seller registers and creates product with variant.
 * 3. Member registers, creates address, adds item to cart, and places order.
 * 4. Seller creates shipment to mark order as delivered.
 * 5. Member creates refund request with specific reason text.
 * 6. Seller approves refund request, creating state transition snapshot.
 * 7. Member retrieves all snapshots and validates state preservation:
 *    7.1. First snapshot has status='pending', reason matches input, seller_response is null.
 *    7.2. Second snapshot has status='approved', reason unchanged, seller_response populated.
 *    7.3. Timestamps show correct chronological progression.
 *    7.4. Snapshot data is immutable and matches state at capture time.
 */
export async function test_api_refund_request_snapshot_state_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup - register and create product with variant
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
      },
    },
  );
  typia.assert(variant);
  // 3. Member setup - register, create address, add to cart, place order
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoin);
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {},
  );
  typia.assert(address);
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
      },
    },
  );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 4. Seller creates shipment to deliver order
  const orderItem = order.orderItems[0];
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
        },
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // 5. Member creates refund request with specific reason text
  const specificReason = "Product received damaged - requesting full refund";
  const refundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: specificReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 6. Seller approves refund request
  const approvedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefundRequest);
  // 7. Member retrieves all snapshots
  const snapshotsResponse =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.snapshots.index(
      memberConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          sort: "asc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // Validate snapshots exist
  TestValidator.predicate(
    "has at least 2 snapshots",
    () => snapshotsResponse.data.length >= 2,
  );
  const firstSnapshot = snapshotsResponse.data[0];
  const secondSnapshot = snapshotsResponse.data[1];
  // Validate first snapshot (pending state)
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "first snapshot reason matches customer input",
    firstSnapshot.reason,
    specificReason,
  );
  TestValidator.equals(
    "first snapshot seller_response is null",
    firstSnapshot.seller_response,
    null,
  );
  TestValidator.equals(
    "first snapshot references correct refund request",
    firstSnapshot.refundRequest.id,
    refundRequest.id,
  );
  // Validate second snapshot (approved state)
  TestValidator.equals(
    "second snapshot status is approved",
    secondSnapshot.status,
    "approved",
  );
  TestValidator.equals(
    "second snapshot reason unchanged from first",
    secondSnapshot.reason,
    specificReason,
  );
  TestValidator.predicate(
    "second snapshot seller_response is populated",
    () => secondSnapshot.seller_response !== null,
  );
  TestValidator.equals(
    "second snapshot references correct refund request",
    secondSnapshot.refundRequest.id,
    refundRequest.id,
  );
  // Validate chronological progression
  TestValidator.predicate(
    "second snapshot created after first snapshot",
    () =>
      new Date(secondSnapshot.created_at).getTime() >
      new Date(firstSnapshot.created_at).getTime(),
  );
  // Validate refund request final state
  TestValidator.equals(
    "refund request final status is approved",
    approvedRefundRequest.status,
    "approved",
  );
}