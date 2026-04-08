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
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller retrieval of post-purchase cancellation request snapshot history.
 *
 * Validates that a seller can retrieve the complete audit trail of snapshots for a post-purchase cancellation request on their order item. The test verifies the snapshot retrieval endpoint returns properly structured paginated data with chronological ordering and all required snapshot fields.
 *
 * The test establishes a complete order lifecycle: seller creates product, member places order, seller ships the order, member requests post-purchase cancellation, and seller retrieves the snapshot history. This ensures the audit trail captures the initial pending state when the customer submits the cancellation request.
 *
 * 1. Seller joins platform and creates product with variant.
 * 2. Member joins platform and places order for seller's product.
 * 3. Seller creates shipment marking order item as shipped.
 * 4. Member creates post-purchase cancellation request generating initial pending snapshot.
 * 5. Seller retrieves snapshot history via PATCH endpoint.
 * 6. Validates response structure, pagination metadata, and snapshot ordering.
 */
export async function test_api_post_purchase_cancellation_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - store credentials and join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 2. Member setup - store credentials and join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoin = await authorize_member_join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoin);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const order =
    await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(order);
  // 3. Seller creates shipment for order item
  const orderItem = order.orderItems[0];
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 4. Member creates post-purchase cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Seller retrieves snapshot history
  const snapshotResponse =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate response structure and pagination
  TestValidator.predicate(
    "has pagination metadata",
    () => snapshotResponse.pagination !== undefined,
  );
  TestValidator.predicate("has data array", () =>
    Array.isArray(snapshotResponse.data),
  );
  TestValidator.predicate(
    "has at least one snapshot",
    () => snapshotResponse.data.length >= 1,
  );
  // Validate pagination metadata
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is set",
    () => snapshotResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count matches data",
    () => snapshotResponse.pagination.records >= snapshotResponse.data.length,
  );
  TestValidator.predicate(
    "pages count is valid",
    () => snapshotResponse.pagination.pages >= 1,
  );
  // Validate snapshot structure and ordering
  const snapshots = snapshotResponse.data;
  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    TestValidator.predicate("snapshot has id", () => snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has status",
      () => snapshot.status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has reason",
      () => snapshot.reason !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      () => snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has seller_response (nullable)",
      () =>
        snapshot.seller_response === null ||
        typeof snapshot.seller_response === "string",
    );
  }
  // Validate chronological ordering (created_at ascending)
  if (snapshots.length > 1) {
    for (let i = 1; i < snapshots.length; i++) {
      const prevDate = new Date(snapshots[i - 1].created_at).getTime();
      const currDate = new Date(snapshots[i].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} created_after snapshot ${i - 1}`,
        () => currDate >= prevDate,
      );
    }
  }
  // Validate initial snapshot has pending status and null seller
  const initialSnapshot = snapshots[0];
  TestValidator.equals(
    "initial snapshot status",
    initialSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "initial snapshot seller_response",
    initialSnapshot.seller_response,
    null,
  );
  TestValidator.equals("initial snapshot seller", initialSnapshot.seller, null);
  // Validate reason is preserved from cancellation request
  TestValidator.equals(
    "snapshot reason matches cancellation request",
    initialSnapshot.reason,
    cancellationRequest.reason,
  );
}