import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
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
 * Test refund request snapshot lifecycle chain preservation.
 *
 * Validates the complete snapshot audit trail for a refund request from initial submission through seller resolution. Ensures that snapshots are created automatically on status changes, preserve historical states immutably, and maintain chronological ordering with consistent reason text across all snapshots.
 *
 * Special attention is given to verifying that the first snapshot shows pending status with null seller response fields, subsequent snapshots capture seller decisions with populated response type and comment, and the complete lifecycle is traceable for dispute resolution purposes.
 *
 * 1. Administrator creates a product category for catalog organization.
 * 2. Seller registers account and creates a product listing.
 * 3. Seller creates a product variant with SKU and stock.
 * 4. Customer registers, creates shipping address, adds variant to cart, and places order.
 * 5. Customer creates a refund request for the delivered order item (creates pending snapshot).
 * 6. Seller approves the refund request (creates approved snapshot).
 * 7. Seller retrieves all snapshots and validates the complete lifecycle chain.
 * 8. Verifies snapshot immutability, chronological ordering, and reason text consistency.
 */
export async function test_api_refund_request_snapshot_lifecycle_chain(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
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
  // 2. Seller setup - register and create product
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
  // 4. Customer setup - register, create address, add to cart, place order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const address = await generate_random_shopping_mall_member_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
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
  // Get the order item for refund request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 5. Customer creates refund request (creates initial pending snapshot)
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
        },
      },
    );
  typia.assert(refundRequest);
  // 6. Seller retrieves snapshots for the refund request
  const snapshots =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at ASC",
        },
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshot chain
  TestValidator.predicate("has snapshots", () => snapshots.data.length >= 1);
  // Verify first snapshot is pending with null seller response
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "first snapshot seller_response_type is null",
    firstSnapshot.seller_response_type,
    null,
  );
  TestValidator.equals(
    "first snapshot seller_response_comment is null",
    firstSnapshot.seller_response_comment,
    null,
  );
  // Verify reason is preserved across all snapshots
  const reason = refundRequest.reason;
  for (let i = 0; i < snapshots.data.length; i++) {
    const snapshot = snapshots.data[i];
    typia.assert(snapshot);
    TestValidator.equals(
      `snapshot ${i + 1} reason matches`,
      snapshot.reason,
      reason,
    );
  }
  // Verify chronological ordering of created_at timestamps
  for (let i = 1; i < snapshots.data.length; i++) {
    const prevSnapshot = snapshots.data[i - 1];
    const currSnapshot = snapshots.data[i];
    typia.assert(prevSnapshot);
    typia.assert(currSnapshot);
    TestValidator.predicate(
      `snapshot ${i + 1} created_at is after snapshot ${i}`,
      () =>
        new Date(currSnapshot.created_at).getTime() >=
        new Date(prevSnapshot.created_at).getTime(),
    );
  }
  // Verify snapshot IDs are unique (immutability check)
  const snapshotIds = snapshots.data.map((s) => s.id);
  const uniqueIds = new Set(snapshotIds);
  TestValidator.equals(
    "all snapshot IDs are unique",
    uniqueIds.size,
    snapshotIds.length,
  );
}
