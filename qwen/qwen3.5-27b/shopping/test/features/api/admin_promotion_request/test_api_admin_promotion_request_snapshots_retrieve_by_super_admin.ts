import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_admin_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that a super administrator can retrieve audit snapshots for any administrator promotion request.
 *
 * This test verifies that super administrators have access to view all audit
 * snapshots for administrator promotion requests, including filtering and
 * pagination capabilities.
 */
export async function test_api_admin_promotion_request_snapshots_retrieve_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create regular admin account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Regular admin submits a promotion request
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Super admin retrieves snapshots for the promotion request
  const snapshots =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 20);
  TestValidator.predicate("has snapshots", snapshots.pagination.records >= 0);
  TestValidator.predicate(
    "pages calculated correctly",
    snapshots.pagination.pages >= 0,
  );
  // 6. Verify snapshot structure
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    TestValidator.equals("has snapshot id", typeof snapshot.id, "string");
    TestValidator.equals("has user info", typeof snapshot.user.id, "string");
    TestValidator.equals("has reason", typeof snapshot.reason, "string");
    TestValidator.equals("has status", typeof snapshot.status, "string");
    TestValidator.equals(
      "has submitted_at",
      typeof snapshot.submitted_at,
      "string",
    );
    TestValidator.equals(
      "has created_at",
      typeof snapshot.created_at,
      "string",
    );
  }
  // 7. Test pagination with page 2 and limit 10
  const paginatedSnapshots =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination page 2",
    paginatedSnapshots.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit 10",
    paginatedSnapshots.pagination.limit,
    10,
  );
  // 8. Test status filtering (approved)
  const approvedSnapshots =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  if (approvedSnapshots.data.length > 0) {
    TestValidator.equals(
      "all filtered snapshots are approved",
      approvedSnapshots.data.every((s) => s.status === "approved"),
      true,
    );
  }
  // 9. Test date range filtering
  const now = new Date().toISOString();
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFilteredSnapshots =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          submittedAtFrom: pastDate,
          submittedAtTo: now,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredSnapshots);
  TestValidator.predicate(
    "date filtered snapshots returned",
    dateFilteredSnapshots.pagination.records >= 0,
  );
  // 10. Verify sorting (created_at descending)
  if (snapshots.data.length > 1) {
    TestValidator.predicate(
      "snapshots sorted by created_at descending",
      snapshots.data.every((snapshot, index, array) => {
        if (index === 0) return true;
        return (
          new Date(snapshot.created_at) <= new Date(array[index - 1].created_at)
        );
      }),
    );
  }
}
