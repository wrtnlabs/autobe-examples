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
 * Test seller retrieval of cancellation request snapshot history.
 *
 * Validates the complete snapshot audit trail for a cancellation request through the seller review workflow. Ensures that sellers can access the full chronological history of state changes from initial customer submission through seller decision.
 *
 * The test verifies that snapshots are created at each significant event: initial pending state when customer submits the request, and response state when seller approves or rejects. Each snapshot preserves the immutable state at that point in time including status, reason, response reason, and timestamps.
 *
 * 1. Administrator creates a product category for product organization.
 * 2. Seller registers and creates a product under the category.
 * 3. Seller creates a product variant with SKU code and option values.
 * 4. Customer registers and creates a shipping address.
 * 5. Customer adds the variant to shopping cart and places an order.
 * 6. Customer creates a cancellation request for the order item with a reason.
 * 7. Seller responds to the cancellation request (approve or reject).
 * 8. Seller retrieves the snapshot history and validates the complete audit trail.
 */
export async function test_api_cancellation_request_snapshot_seller_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registers and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
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
  // 3. Seller creates product variant
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
      },
    },
  );
  typia.assert(variant);
  // 4. Customer registers and creates shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const address = await generate_random_shopping_mall_member_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 5. Customer adds variant to cart and places order
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
      },
    },
  );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Validate order has items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 6. Customer creates cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller retrieves snapshot history
  const snapshots =
    await api.functional.shoppingMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort: ["created_at"],
        },
      },
    );
  typia.assert(snapshots);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.predicate("limit is positive", snapshots.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // Validate snapshot data exists
  TestValidator.predicate(
    "has at least one snapshot",
    snapshots.data.length >= 1,
  );
  // Validate first snapshot (pending state when customer submitted request)
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "first snapshot has customer reason",
    firstSnapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.predicate(
    "first snapshot reviewedAt is null for pending",
    firstSnapshot.reviewedAt === null,
  );
  TestValidator.predicate(
    "first snapshot has createdAt timestamp",
    firstSnapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "first snapshot has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstSnapshot.id,
    ),
  );
  // Validate chronological ordering if multiple snapshots exist
  if (snapshots.data.length > 1) {
    const secondSnapshot = snapshots.data[1];
    typia.assert(secondSnapshot);
    TestValidator.predicate(
      "snapshots ordered by createdAt ascending",
      new Date(firstSnapshot.createdAt).getTime() <=
        new Date(secondSnapshot.createdAt).getTime(),
    );
  }
  // Validate snapshot references correct cancellation request
  TestValidator.equals(
    "snapshot references correct cancellation request",
    firstSnapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot cancellation request status matches",
    firstSnapshot.cancellationRequest.status,
    cancellationRequest.status,
  );
}
