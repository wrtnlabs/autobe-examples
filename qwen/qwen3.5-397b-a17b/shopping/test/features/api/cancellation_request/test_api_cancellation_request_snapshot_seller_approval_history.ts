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
 * Test snapshot history retrieval after seller approves cancellation request, verifying multiple snapshots showing state progression.
 *
 * Validates the complete cancellation request lifecycle through seller approval, ensuring that the snapshot audit trail correctly captures state transitions from pending to approved status. The test verifies that each significant event (customer submission and seller approval) creates an immutable snapshot preserving the request state at that moment.
 *
 * Special attention is given to verifying that the customer's cancellation reason is preserved identically across all snapshots, and that the reviewedAt timestamp is correctly populated only when the seller responds to the request.
 *
 * 1. Member joins and authenticates with unique credentials.
 * 2. Member creates shipping address required for order checkout.
 * 3. Admin joins and creates product category for organization.
 * 4. Seller joins and creates product in the category.
 * 5. Seller creates product variant with SKU and option values.
 * 6. Member adds variant to shopping cart.
 * 7. Member places order creating order items with paid status.
 * 8. Member creates cancellation request for order item generating initial pending snapshot.
 * 9. Seller approves the cancellation request creating approved status snapshot.
 * 10. Retrieve snapshot history and validate exactly 2 snapshots exist with correct state progression.
 */
export async function test_api_cancellation_request_snapshot_seller_approval_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - join and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Member creates shipping address for checkout
  const address =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {},
    );
  typia.assert(address);
  // 3. Admin setup - join and create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Seller setup - join and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
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
  // 5. Seller creates product variant
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
      },
    },
  );
  typia.assert(variant);
  // 6. Member adds variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
      },
    },
  );
  typia.assert(cartItem);
  // 7. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Get the first order item for cancellation
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 8. Member creates cancellation request (creates first snapshot with pending status)
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
  // 9. Seller approves the cancellation request (creates second snapshot with approved status)
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // Verify approval was successful
  TestValidator.equals(
    "cancellation status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "respondedAt is populated after approval",
    approvedRequest.respondedAt !== null,
  );
  // 10. Retrieve snapshot history
  const snapshotHistory =
    await api.functional.shoppingMall.member.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort: ["created_at"],
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotHistory);
  // Validate pagination
  TestValidator.equals(
    "total records is 2",
    snapshotHistory.pagination.records,
    2,
  );
  TestValidator.equals(
    "current page is 1",
    snapshotHistory.pagination.current,
    1,
  );
  TestValidator.equals("total pages is 1", snapshotHistory.pagination.pages, 1);
  // Validate snapshot count
  TestValidator.equals(
    "snapshot array length is 2",
    snapshotHistory.data.length,
    2,
  );
  const [firstSnapshot, secondSnapshot] = snapshotHistory.data;
  // Validate first snapshot (pending status)
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "first snapshot reviewedAt is null",
    firstSnapshot.reviewedAt,
    null,
  );
  TestValidator.equals(
    "first snapshot responseReason is null",
    firstSnapshot.responseReason,
    null,
  );
  // Validate second snapshot (approved status)
  TestValidator.equals(
    "second snapshot status is approved",
    secondSnapshot.status,
    "approved",
  );
  TestValidator.predicate(
    "second snapshot reviewedAt is populated",
    secondSnapshot.reviewedAt !== null,
  );
  TestValidator.equals(
    "second snapshot responseReason is null (approval has no rejection reason)",
    secondSnapshot.responseReason,
    null,
  );
  // Validate customer reason is preserved identically across snapshots
  TestValidator.equals(
    "customer reason preserved in first snapshot",
    firstSnapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "customer reason preserved in second snapshot",
    secondSnapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "customer reason identical across both snapshots",
    firstSnapshot.reason,
    secondSnapshot.reason,
  );
  // Validate chronological ordering
  TestValidator.predicate(
    "second snapshot createdAt is after first snapshot",
    new Date(secondSnapshot.createdAt).getTime() >
      new Date(firstSnapshot.createdAt).getTime(),
  );
  // Validate cancellation request references match
  TestValidator.equals(
    "first snapshot cancellation request ID matches",
    firstSnapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "second snapshot cancellation request ID matches",
    secondSnapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
}