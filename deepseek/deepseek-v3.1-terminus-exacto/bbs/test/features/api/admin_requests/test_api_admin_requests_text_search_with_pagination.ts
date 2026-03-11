import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_requests_text_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Basic text search with common terms that might exist
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          search: "admin",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Test 2: Pagination navigation
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          search: "admin",
          limit: 5,
          page: 2,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Search with no matches (using unlikely combination)
  const noMatchResult =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          search: "xyz123unlikelysearchterm",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(noMatchResult);
  // Test 4: Empty search term (should return all results)
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          search: "",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Test 5: Search combined with status filter
  const filteredSearchResult =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          search: "admin",
          status: "pending",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(filteredSearchResult);
  // Test 6: Search with special characters
  const specialCharResult =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          search: "role",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(specialCharResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have current page",
    searchResult1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    searchResult1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have total records",
    searchResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    searchResult1.pagination.pages >= 0,
  );
  // Validate pagination calculations
  if (searchResult1.pagination.records > 0) {
    const expectedPages = Math.ceil(
      searchResult1.pagination.records / searchResult1.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation should match records and limit",
      searchResult1.pagination.pages,
      expectedPages,
    );
  }
  // Validate that search functionality works
  if (searchResult1.data.length > 0) {
    // Check that search results contain the search term in reason field (case insensitive)
    const hasMatchingResult = searchResult1.data.some((item) =>
      item.reason.toLowerCase().includes("admin"),
    );
    TestValidator.predicate(
      "search results should contain search term",
      hasMatchingResult,
    );
  }
  // Validate that different pages return different data when multiple pages exist
  if (searchResult1.pagination.pages > 1 && searchResult2.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and page 2 should have different data when multiple pages exist",
      searchResult1.data,
      searchResult2.data,
    );
  }
  // Test edge case: maximum page limit
  const maxPageResult =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          search: "admin",
          limit: 5,
          page:
            searchResult1.pagination.pages > 0
              ? searchResult1.pagination.pages
              : 1,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(maxPageResult);
}
