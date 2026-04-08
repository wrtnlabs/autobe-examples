import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test customer retrieval of post-purchase cancellation request snapshot audit trail.
 *
 * Validates the complete audit trail functionality for post-purchase cancellation requests. Ensures that customers can access the historical record of status changes for their cancellation requests, with each snapshot preserving the exact state at the time of creation.
 *
 * The test verifies that the initial snapshot is automatically created when the customer submits a cancellation request, containing the pending status, customer-provided reason, and null seller response fields. The audit trail serves as immutable evidence for dispute resolution and compliance purposes.
 *
 * 1. Customer (member) registers and authenticates via /auth/member/join.
 * 2. Seller registers and authenticates via /auth/seller/join.
 * 3. Seller creates a product with name, description, category, and base price.
 * 4. Seller creates a product variant with SKU code and option values.
 * 5. Customer places an order containing the product variant.
 * 6. Customer creates a post-purchase cancellation request with a reason text.
 * 7. Customer retrieves the snapshot audit trail for the cancellation request.
 * 8. Validates pagination metadata, snapshot count, and initial snapshot fields.
 */
export async function test_api_post_purchase_cancellation_request_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer (member) registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer places an order containing the product variant
  const order =
    await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(order);
  // Get the first order item from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 6. Customer creates a post-purchase cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: cancellationReason,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Customer retrieves the snapshot audit trail
  const snapshotsResponse =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    snapshotsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is positive",
    snapshotsResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages count is positive",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 9. Validate at least 1 snapshot exists (initial pending snapshot)
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsResponse.data.length >= 1,
  );
  // 10. Validate the initial snapshot fields
  const initialSnapshot = snapshotsResponse.data[0];
  // Verify status is 'pending'
  TestValidator.equals(
    "initial snapshot status is pending",
    initialSnapshot.status,
    "pending",
  );
  // Verify reason matches the exact text provided by customer
  TestValidator.equals(
    "snapshot reason matches cancellation request reason",
    initialSnapshot.reason,
    cancellationReason,
  );
  // Verify seller_response is null for initial snapshot
  TestValidator.equals(
    "initial snapshot seller_response is null",
    initialSnapshot.seller_response,
    null,
  );
  // Verify seller is null for initial snapshot
  TestValidator.equals(
    "initial snapshot seller is null",
    initialSnapshot.seller,
    null,
  );
  // 11. Verify snapshots are ordered by created_at ascending
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const prevTime = new Date(
        snapshotsResponse.data[i - 1].created_at,
      ).getTime();
      const currTime = new Date(snapshotsResponse.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshots ordered chronologically (${i - 1} -> ${i})`,
        prevTime <= currTime,
      );
    }
  }
}