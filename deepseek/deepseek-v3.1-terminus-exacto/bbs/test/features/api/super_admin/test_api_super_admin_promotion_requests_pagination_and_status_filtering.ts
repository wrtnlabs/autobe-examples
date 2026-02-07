import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_promotion_requests_pagination_and_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test pagination with status filtering for approved requests
  // Since we cannot create promotion requests through available APIs,
  // we test the search functionality with pagination parameters
  const searchResult =
    await api.functional.discussionBoard.superAdmin.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate pagination calculation
  if (searchResult.pagination.records === 0) {
    TestValidator.equals(
      "pages should be 0 when no records",
      searchResult.pagination.pages,
      0,
    );
    TestValidator.equals(
      "current page should be 0 when no records",
      searchResult.pagination.current,
      0,
    );
  } else {
    TestValidator.equals(
      "pages calculation is correct",
      searchResult.pagination.pages,
      Math.ceil(
        searchResult.pagination.records / searchResult.pagination.limit,
      ),
    );
    TestValidator.predicate(
      "current page is within valid range",
      searchResult.pagination.current >= 1 &&
        searchResult.pagination.current <= searchResult.pagination.pages,
    );
  }
  // Validate that all returned requests have approved status
  for (const request of searchResult.data) {
    TestValidator.equals(
      "request status is approved",
      request.status,
      "approved",
    );
  }
  // Validate data length matches pagination
  if (
    searchResult.pagination.current === searchResult.pagination.pages &&
    searchResult.pagination.pages > 0
  ) {
    // Last page may have fewer items than limit
    TestValidator.predicate(
      "data length matches last page",
      searchResult.data.length <= searchResult.pagination.limit,
    );
  } else if (searchResult.pagination.current > 0) {
    // Non-last page should have full limit
    TestValidator.equals(
      "data length matches limit",
      searchResult.data.length,
      searchResult.pagination.limit,
    );
  }
}
