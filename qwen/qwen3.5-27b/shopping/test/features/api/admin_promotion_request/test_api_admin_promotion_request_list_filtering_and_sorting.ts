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
 * Test filtering and sorting capabilities of the admin promotion requests list endpoint.
 * Validates status filtering, text search, date range filtering, custom sorting, and pagination accuracy.
 */
export async function test_api_admin_promotion_request_list_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Setup: Create first regular admin and submit promotion request
  const admin1Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const firstRequestReason =
    "I need super admin access to manage platform operations";
  const firstRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      admin1Connection,
      {
        body: { reason: firstRequestReason },
      },
    );
  typia.assert(firstRequest);
  // 3. Setup: Create second regular admin and submit promotion request
  const admin2Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const secondRequestReason =
    "Requesting elevated privileges for better user management";
  const secondRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      admin2Connection,
      {
        body: { reason: secondRequestReason },
      },
    );
  typia.assert(secondRequest);
  // 4. Setup: Approve first request to create 'approved' status record
  const approvedRequest =
    await api.functional.shoppingMall.admin.adminPromotionRequests.approveOrReject(
      superAdminConnection,
      {
        requestId: firstRequest.id,
        body: {
          action: "approve",
        } satisfies IShoppingMallAdminPromotionRequest.IApproveOrReject,
      },
    );
  typia.assert(approvedRequest);
  // 5. Test: Filter by status='pending'
  const pendingFilterResult =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.equals(
    "pending filter returns only pending requests",
    pendingFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "pending request is the second one",
    pendingFilterResult.data[0].id,
    secondRequest.id,
  );
  // 6. Test: Filter by status='approved'
  const approvedFilterResult =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedFilterResult);
  TestValidator.equals(
    "approved filter returns only approved requests",
    approvedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "approved request is the first one",
    approvedFilterResult.data[0].id,
    firstRequest.id,
  );
  // 7. Test: Text search functionality
  const searchResult =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          search: "super admin",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search finds requests containing keywords",
    searchResult.data.length >= 1,
  );
  TestValidator.predicate(
    "search result contains matching reason",
    searchResult.data.some(
      (req) =>
        req.reason.toLowerCase().includes("super") ||
        req.reason.toLowerCase().includes("admin"),
    ),
  );
  // 8. Test: Date range filtering
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const dateRangeResult =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          submittedAtFrom: oneDayAgo.toISOString(),
          submittedAtTo: new Date().toISOString(),
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns both requests within range",
    dateRangeResult.data.length,
    2,
  );
  // 9. Test: Sort by submitted_at ASC
  const sortBySubmittedAsc =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          sort: "submitted_at",
          order: "asc",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sortBySubmittedAsc);
  TestValidator.equals(
    "sort by submitted_at ASC returns oldest first",
    new Date(sortBySubmittedAsc.data[0].submitted_at).getTime(),
    Math.min(
      new Date(firstRequest.submitted_at).getTime(),
      new Date(secondRequest.submitted_at).getTime(),
    ),
  );
  // 10. Test: Sort by submitted_at DESC
  const sortBySubmittedDesc =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          sort: "submitted_at",
          order: "desc",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sortBySubmittedDesc);
  TestValidator.equals(
    "sort by submitted_at DESC returns newest first",
    new Date(sortBySubmittedDesc.data[0].submitted_at).getTime(),
    Math.max(
      new Date(firstRequest.submitted_at).getTime(),
      new Date(secondRequest.submitted_at).getTime(),
    ),
  );
  // 11. Test: Sort by responded_at DESC
  const sortByRespondedDesc =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          sort: "responded_at",
          order: "desc",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sortByRespondedDesc);
  TestValidator.predicate(
    "sort by responded_at DESC places approved request first",
    sortByRespondedDesc.data[0].id === firstRequest.id,
  );
  // 13. Test: Pagination with custom page and limit
  const paginationResult =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page matches request",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records count is accurate",
    paginationResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages count is accurate",
    paginationResult.pagination.pages,
    1,
  );
  // 14. Test: Combined filters (status + search)
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search: "elevated privileges",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns matching pending request",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter returns correct request",
    combinedFilterResult.data[0].id,
    secondRequest.id,
  );
}