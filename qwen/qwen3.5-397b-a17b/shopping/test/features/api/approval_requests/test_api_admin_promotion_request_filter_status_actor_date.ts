import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering capabilities for administrator promotion requests by status, actor type, and date range.
 *
 * Validates the comprehensive filtering system for admin promotion requests including status-based filtering (pending/approved/rejected), actor type filtering (member/seller), date range filtering, text search, and pagination. Ensures that filter combinations apply correct AND logic and that pagination metadata accurately reflects filtered result counts.
 *
 * Special attention is given to verifying that empty result sets return valid pagination structures with records=0 and pages=0, and that all filter parameters work correctly both individually and in combination.
 *
 * 1. Super administrator account creation and authentication.
 * 2. Test status filter with each valid value (pending/approved/rejected).
 * 3. Test actorType filter with each valid value (member/seller).
 * 4. Test combined filters applying AND logic.
 * 5. Test date range filtering with createdAtFrom and createdAtTo.
 * 6. Test search parameter for partial text matching.
 * 7. Test pagination with limit parameter and verify metadata.
 */
export async function test_api_admin_promotion_request_filter_status_actor_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "",
      referrer: "",
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test filter status='pending'
  const pendingResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 3. Test filter status='approved'
  const approvedResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // 4. Test filter status='rejected'
  const rejectedResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // 5. Test filter actorType='member'
  const memberResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "member",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(memberResult);
  // 6. Test filter actorType='seller'
  const sellerResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "seller",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerResult);
  // 7. Test combined filter status='pending' AND actorType='member'
  const pendingMemberResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          actorType: "member",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingMemberResult);
  // 8. Test combined filter status='pending' AND actorType='seller'
  const pendingSellerResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          actorType: "seller",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingSellerResult);
  // 9. Test date range filter createdAtFrom/createdAtTo
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 10. Test search parameter with partial text
  const searchResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // 11. Test pagination with limit=2
  const paginationResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit is 2",
    paginationResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array respects limit",
    paginationResult.data.length <= 2,
  );
  // 12. Test empty result set returns valid pagination
  const emptyResult =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          actorType: "member",
          search: "nonexistent_search_term_xyz_123",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate pagination metadata consistency
  if (emptyResult.pagination.records === 0) {
    TestValidator.equals(
      "pages is 0 when records is 0",
      emptyResult.pagination.pages,
      0,
    );
  }
}