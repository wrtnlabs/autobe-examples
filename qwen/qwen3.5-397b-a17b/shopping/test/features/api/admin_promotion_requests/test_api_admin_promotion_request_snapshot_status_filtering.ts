import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that a seller can filter snapshots by status to find specific state changes
 * in their administrator promotion request audit trail.
 *
 * Test Steps:
 * 1. Register a new seller account via /shoppingMall/auth/seller/join
 * 2. Submit an administrator promotion request via /shoppingMall/seller/admin-promotion-requests
 * 3. Retrieve snapshots with requestBody filter status='pending'
 * 4. Verify response contains only snapshots with status='pending'
 * 5. Retrieve snapshots with requestBody filter status='approved' (should be empty initially)
 * 6. Retrieve snapshots with requestBody filter status='rejected' (should be empty initially)
 *
 * Validation Points:
 * - Filtering by status='pending' returns the initial snapshot
 * - Filtering by status='approved' returns empty data array when request is still pending
 * - Filtering by status='rejected' returns empty data array when request is still pending
 * - Pagination metadata correctly reflects filtered record counts
 * - All returned snapshots match the requested status filter value
 */
export async function test_api_admin_promotion_request_snapshot_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
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
  // 2. Create administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Retrieve snapshots with status='pending' filter
  const pendingSnapshots =
    await api.functional.shoppingMall.seller.admin_promotion_requests.snapshots.index(
      sellerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "pending",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  // 4. Verify pending snapshots contain only pending status
  TestValidator.predicate(
    "pending filter returns at least one snapshot",
    pendingSnapshots.data.length >= 1,
  );
  for (const snapshot of pendingSnapshots.data) {
    TestValidator.equals(
      "all pending snapshots have status='pending'",
      snapshot.status,
      "pending",
    );
  }
  TestValidator.equals(
    "pending pagination records match data length",
    pendingSnapshots.pagination.records,
    pendingSnapshots.data.length,
  );
  // 5. Retrieve snapshots with status='approved' filter (should be empty)
  const approvedSnapshots =
    await api.functional.shoppingMall.seller.admin_promotion_requests.snapshots.index(
      sellerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // 6. Verify approved snapshots are empty when request is still pending
  TestValidator.equals(
    "approved filter returns empty when request is pending",
    approvedSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "approved pagination records is zero",
    approvedSnapshots.pagination.records,
    0,
  );
  // 7. Retrieve snapshots with status='rejected' filter (should be empty)
  const rejectedSnapshots =
    await api.functional.shoppingMall.seller.admin_promotion_requests.snapshots.index(
      sellerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // 8. Verify rejected snapshots are empty when request is still pending
  TestValidator.equals(
    "rejected filter returns empty when request is pending",
    rejectedSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "rejected pagination records is zero",
    rejectedSnapshots.pagination.records,
    0,
  );
}
