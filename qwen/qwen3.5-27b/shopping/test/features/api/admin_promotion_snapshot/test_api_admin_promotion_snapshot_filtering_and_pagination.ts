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
 * Test filtering and pagination functionality for administrator promotion request snapshots.
 *
 * This test validates the snapshot filtering and pagination capabilities by:
 * 1. Creating a super administrator account
 * 2. Creating multiple promotion requests with various statuses
 * 3. Testing different filter combinations (status, date range, pagination, sorting)
 * 4. Verifying pagination metadata accuracy
 */
export async function test_api_admin_promotion_snapshot_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create multiple promotion requests for testing
  const promotionRequests: IShoppingMallAdminPromotionRequest[] = [];
  for (let i = 0; i < 5; i++) {
    const request =
      await generate_random_shopping_mall_admin_admin_promotion_requests_create(
        superAdminConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(request);
    promotionRequests.push(request);
  }
  // 3. Test: Retrieve snapshots with status filter (approved)
  const approvedSnapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequests[0].id,
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // 4. Test: Retrieve snapshots with status filter (rejected)
  const rejectedSnapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequests[1].id,
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // 5. Test: Date range filter on created_at
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredSnapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequests[2].id,
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredSnapshots);
  // 6. Test: Pagination (page 2 with limit 10)
  const paginatedSnapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequests[3].id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination returns correct page number",
    paginatedSnapshots.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination returns correct limit",
    paginatedSnapshots.pagination.limit,
    10,
  );
  // 7. Test: Sorting by submitted_at in ascending order
  const sortedSnapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequests[4].id,
        body: {
          sortBy: "submitted_at",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(sortedSnapshots);
  // 8. Test: Combined filters (status + date range + pagination)
  const combinedFilteredSnapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequests[0].id,
        body: {
          status: "pending",
          createdAtFrom: oneDayAgo.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilteredSnapshots);
  TestValidator.equals(
    "combined filters return correct limit",
    combinedFilteredSnapshots.pagination.limit,
    5,
  );
  // 9. Test: Empty result set returns valid pagination
  const emptySnapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty result set has empty data array",
    emptySnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "empty result set has zero records",
    emptySnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set has zero pages",
    emptySnapshots.pagination.pages,
    0,
  );
}
