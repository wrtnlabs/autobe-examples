import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
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
 * Test filtering administrator promotion requests by status and date range.
 *
 * This test validates the filtering capabilities of the admin promotion requests
 * list endpoint, ensuring that requests can be correctly filtered by approval
 * status (pending, approved, rejected) and submission date range.
 */
export async function test_api_admin_promotion_request_list_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create test promotion requests with different statuses and dates
  // Create pending request
  const pendingRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {},
    );
  typia.assert(pendingRequest);
  // Create another pending request for better test coverage
  const pendingRequest2 =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {},
    );
  typia.assert(pendingRequest2);
  // 3. Test filter by status='pending'
  const pendingFilterResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.equals(
    "pending filter returns correct count",
    pendingFilterResult.data.length,
    2,
  );
  TestValidator.predicate("all pending requests have null responded_at", () =>
    pendingFilterResult.data.every((req) => req.responded_at === null),
  );
  TestValidator.predicate("all pending requests have status 'pending'", () =>
    pendingFilterResult.data.every((req) => req.status === "pending"),
  );
  // 4. Test filter by status='approved' (should return empty initially)
  const approvedFilterResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedFilterResult);
  TestValidator.equals(
    "approved filter returns empty initially",
    approvedFilterResult.data.length,
    0,
  );
  // 5. Test filter by status='rejected' (should return empty initially)
  const rejectedFilterResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(rejectedFilterResult);
  TestValidator.equals(
    "rejected filter returns empty initially",
    rejectedFilterResult.data.length,
    0,
  );
  // 6. Test filter by date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeFilterResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          submittedAtFrom: yesterday.toISOString(),
          submittedAtTo: tomorrow.toISOString(),
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(dateRangeFilterResult);
  TestValidator.predicate(
    "date range filter returns requests within range",
    () => {
      return dateRangeFilterResult.data.every((req) => {
        const submittedAt = new Date(req.submitted_at);
        return submittedAt >= yesterday && submittedAt <= tomorrow;
      });
    },
  );
  // 7. Test combined filters (status + date range)
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          submittedAtFrom: yesterday.toISOString(),
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate("combined filter returns only pending requests", () =>
    combinedFilterResult.data.every((req) => req.status === "pending"),
  );
  TestValidator.predicate("combined filter respects date range", () => {
    return combinedFilterResult.data.every((req) => {
      const submittedAt = new Date(req.submitted_at);
      return submittedAt >= yesterday;
    });
  });
  // 8. Test pagination with filters
  const paginationFilterResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(paginationFilterResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination metadata correct",
    paginationFilterResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    () => paginationFilterResult.pagination.current === 1,
  );
  // 9. Test empty results with non-matching filter
  const emptyFilterResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "non-matching status returns empty array",
    emptyFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty results pagination records is 0",
    emptyFilterResult.pagination.records,
    0,
  );
}
