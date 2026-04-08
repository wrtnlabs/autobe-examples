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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that an administrator can filter refund request snapshots by status to view specific state transitions.
 *
 * Validates the complete refund request snapshot filtering workflow including administrative setup, seller product creation, customer order placement, refund request submission, and admin snapshot retrieval with status filtering. Ensures that the snapshot history endpoint correctly accepts and processes status filter parameters.
 *
 * Special attention is given to verifying that the status filter parameter is properly applied and that the response structure includes correct pagination metadata and snapshot data with all required fields.
 *
 * 1. Administrator joins and authenticates to access admin endpoints.
 * 2. Seller joins, authenticates, creates category, product, and variant.
 * 3. Customer (member) joins, authenticates, creates address, adds item to cart, places order.
 * 4. Customer submits refund request which creates initial snapshot with pending status.
 * 5. Admin retrieves snapshots with status filter to verify filtering functionality works.
 */
export async function test_api_refund_request_snapshot_admin_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords for reuse in login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: "regular" as const,
    },
  });
  typia.assert(adminJoin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup - join, login, create category, product, variant
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
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create variant
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
        price: null,
      },
    },
  );
  typia.assert(variant);
  // 3. Customer (member) setup - join, login, create address, cart, order
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
  await authorize_member_login(memberConnection, {
    body: {
      email: memberJoin.email,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create address
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {},
  );
  typia.assert(address);
  // Add to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // Place order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Get order item for refund request
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // 4. Customer submits refund request (creates pending snapshot)
  const refundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Admin retrieves snapshots with status filter = "pending"
  const pendingSnapshots =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
          sort: "asc",
        },
      },
    );
  typia.assert(pendingSnapshots);
  // Validate that pending snapshots are returned
  TestValidator.predicate(
    "pending snapshots returned",
    pendingSnapshots.data.length >= 1,
  );
  // Validate all returned snapshots have status "pending"
  const allPending = pendingSnapshots.data.every(
    (snapshot) => snapshot.status === "pending",
  );
  TestValidator.predicate("all filtered snapshots are pending", allPending);
  // Test with status filter = "rejected" (should return empty since no rejection occurred)
  const rejectedSnapshots =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
          sort: "asc",
        },
      },
    );
  typia.assert(rejectedSnapshots);
  // Validate rejected filter returns empty (no rejection happened)
  TestValidator.equals(
    "rejected snapshots empty",
    rejectedSnapshots.data.length,
    0,
  );
  // Test without status filter - should return all snapshots
  const allSnapshots =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "asc",
        },
      },
    );
  typia.assert(allSnapshots);
  // Validate that unfiltered count >= filtered count
  TestValidator.predicate(
    "all snapshots count >= pending count",
    allSnapshots.data.length >= pendingSnapshots.data.length,
  );
  // Validate pagination metadata is present and valid
  TestValidator.predicate(
    "pagination current page is valid",
    allSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allSnapshots.pagination.records >= 0,
  );
}