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
 * Test refund request snapshot history retrieval for complete audit trail.
 *
 * Validates the administrator's ability to retrieve the complete history of state changes for a refund request through the snapshot audit trail system. The test establishes a full e-commerce workflow from product creation through order placement to refund request submission, then verifies the snapshot history endpoint returns accurate chronological records.
 *
 * The snapshot system creates immutable audit records whenever a refund request's state changes, preserving the status, customer reason, and seller response details at each moment. This enables dispute resolution and compliance auditing by maintaining a complete lifecycle history from initial submission through final resolution.
 *
 * 1. Administrator joins platform and creates product category for catalog organization.
 * 2. Seller joins platform and creates product under the category with base pricing.
 * 3. Seller creates product variant with SKU code and option values for purchasable configuration.
 * 4. Member joins platform and creates shipping address for order delivery.
 * 5. Member adds variant to shopping cart and places order converting cart items to order items.
 * 6. Member creates refund request for delivered order item with reason text.
 * 7. Administrator retrieves snapshot history via PATCH /shoppingMall/admin/refund-requests/{refundRequestId}/snapshots.
 * 8. Validates response contains snapshots ordered chronologically by created_at ascending.
 * 9. Validates each snapshot contains required fields: id, status, reason, seller_response_type, seller_response_comment, created_at.
 * 10. Validates initial snapshot shows status='pending' with null seller_response_type and seller_response_comment.
 * 11. Validates pagination metadata includes current page, limit, total records, and total pages.
 */
export async function test_api_refund_request_snapshot_history_complete_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
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
  // 2. Seller setup - create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
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
  // 3. Member setup - create address and place order
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {},
  );
  typia.assert(address);
  await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Get the first order item for refund request
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", () => order.orderItems.length > 0);
  // 4. Create refund request
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Administrator retrieves snapshot history
  const snapshotHistory =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at ASC",
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotHistory);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    () => snapshotHistory.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshotHistory.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    () => snapshotHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has records",
    () => snapshotHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    () => snapshotHistory.pagination.pages >= 0,
  );
  // 7. Validate snapshot data
  TestValidator.predicate(
    "has at least one snapshot",
    () => snapshotHistory.data.length >= 1,
  );
  // 8. Validate each snapshot has required fields
  for (const snapshot of snapshotHistory.data) {
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
    // seller_response_type and seller_response_comment can be null for pending status
  }
  // 9. Validate chronological ordering (created_at ascending)
  if (snapshotHistory.data.length > 1) {
    for (let i = 1; i < snapshotHistory.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is after snapshot ${i - 1}`,
        () =>
          new Date(snapshotHistory.data[i].created_at).getTime() >=
          new Date(snapshotHistory.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 10. Validate initial snapshot shows pending status with null seller responses
  const initialSnapshot = snapshotHistory.data[0];
  TestValidator.equals(
    "initial status is pending",
    initialSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "initial seller_response_type is null",
    initialSnapshot.seller_response_type,
    null,
  );
  TestValidator.equals(
    "initial seller_response_comment is null",
    initialSnapshot.seller_response_comment,
    null,
  );
  // 11. Validate reason matches refund request reason
  TestValidator.equals(
    "reason matches",
    initialSnapshot.reason,
    refundRequest.reason,
  );
}
