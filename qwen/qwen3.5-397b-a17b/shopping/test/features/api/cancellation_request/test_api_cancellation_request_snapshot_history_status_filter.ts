import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
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
import { generate_random_shopping_mall_member_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test cancellation request snapshot history retrieval with status filter to verify filtering functionality works correctly.
 *
 * Validates the complete cancellation request workflow including member authentication, order creation, cancellation request submission, seller rejection, and snapshot history filtering. Ensures that the status filter correctly returns only snapshots matching the specified workflow state.
 *
 * Special attention is given to verifying that the status filter excludes non-matching snapshots, that rejected snapshots contain the seller's response reason, and that pagination metadata accurately reflects the filtered result count rather than total snapshots.
 *
 * 1. Member joins and authenticates, creates shipping address for checkout.
 * 2. Admin joins and creates product category for organization.
 * 3. Seller joins and creates product with variant in the category.
 * 4. Member adds variant to cart and places order creating order items.
 * 5. Member creates cancellation request generating initial pending snapshot.
 * 6. Seller rejects cancellation request creating rejected status snapshot with response reason.
 * 7. Query snapshot history with status='rejected' filter, verify exactly 1 snapshot returned.
 * 8. Query snapshot history with status='pending' filter, verify exactly 1 snapshot returned.
 * 9. Validate pagination metadata reflects filtered counts correctly.
 */
export async function test_api_cancellation_request_snapshot_history_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - join and create address
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  const address =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {},
    );
  typia.assert(address);
  // 2. Admin setup - join and create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller setup - join and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
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
  // 4. Member adds variant to cart and places order
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
  // Get the order item ID for cancellation request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 5. Member creates cancellation request (creates pending snapshot)
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller rejects cancellation request (creates rejected snapshot)
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectResult =
    await api.functional.shoppingMall.seller.cancellation_requests.reject(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          reason: rejectionReason,
        } satisfies IShoppingMallCancellationRequest.IReject,
      },
    );
  typia.assert(rejectResult);
  // 7. Query snapshot history with status='rejected' filter
  const rejectedSnapshots =
    await api.functional.shoppingMall.member.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected" as const,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Validate rejected filter results
  TestValidator.equals(
    "rejected snapshot count",
    rejectedSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "rejected snapshot status",
    rejectedSnapshots.data[0].status,
    "rejected",
  );
  TestValidator.equals(
    "rejected snapshot has response reason",
    rejectedSnapshots.data[0].responseReason !== null,
    true,
  );
  TestValidator.predicate(
    "rejected snapshot reviewedAt is populated",
    rejectedSnapshots.data[0].reviewedAt !== null,
  );
  TestValidator.equals(
    "rejected pagination records count",
    rejectedSnapshots.pagination.records,
    1,
  );
  // 8. Query snapshot history with status='pending' filter
  const pendingSnapshots =
    await api.functional.shoppingMall.member.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "pending" as const,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  // Validate pending filter results
  TestValidator.equals(
    "pending snapshot count",
    pendingSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "pending snapshot status",
    pendingSnapshots.data[0].status,
    "pending",
  );
  TestValidator.equals(
    "pending snapshot has no response reason",
    pendingSnapshots.data[0].responseReason,
    null,
  );
  TestValidator.equals(
    "pending snapshot reviewedAt is null",
    pendingSnapshots.data[0].reviewedAt,
    null,
  );
  TestValidator.equals(
    "pending pagination records count",
    pendingSnapshots.pagination.records,
    1,
  );
  // 9. Validate total snapshots without filter (should be 2)
  const allSnapshots =
    await api.functional.shoppingMall.member.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals(
    "total snapshot count without filter",
    allSnapshots.data.length,
    2,
  );
  TestValidator.equals(
    "total pagination records count",
    allSnapshots.pagination.records,
    2,
  );
}