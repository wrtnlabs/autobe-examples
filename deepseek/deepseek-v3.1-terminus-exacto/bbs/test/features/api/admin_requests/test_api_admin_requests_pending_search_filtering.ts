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

export async function test_api_admin_requests_pending_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Test search functionality with different criteria
  // Test partial matching with 'exper'
  const searchExper =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search: "exper",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchExper);
  // Test partial matching with 'manage'
  const searchManage =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search: "manage",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchManage);
  // Test case-insensitive search
  const searchCommunityUpper =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search: "COMMUNITY",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchCommunityUpper);
  // Test empty search term (should return all pending requests)
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search: "",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Step 3: Validate search results structure
  TestValidator.predicate(
    "search results have pagination",
    searchExper.pagination !== undefined,
  );
  TestValidator.predicate(
    "search results have data array",
    Array.isArray(searchExper.data),
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    searchExper.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchExper.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    searchExper.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    searchExper.pagination.pages >= 0,
  );
  // Step 4: Test pagination parameters
  const paginatedSearch =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search: "experience",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Validate pagination limits
  TestValidator.predicate(
    "paginated results respect limit",
    paginatedSearch.data.length <= paginatedSearch.pagination.limit,
  );
  // Step 5: Test edge case with very long search string
  const longSearch =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search: "a".repeat(100), // 100-character search string
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(longSearch);
  // Step 6: Test search with special characters
  const specialCharSearch =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search: "experience-management",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(specialCharSearch);
  // Step 7: Validate that search functionality works with different search patterns
  // Test that different search terms return valid responses
  TestValidator.predicate(
    "search with 'exper' returns valid response",
    searchExper.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.reason === "string" &&
        typeof item.status === "string" &&
        typeof item.created_at === "string" &&
        typeof item.member === "object",
    ),
  );
  // Validate member structure in search results
  if (searchExper.data.length > 0) {
    TestValidator.predicate(
      "member has valid structure",
      typeof searchExper.data[0].member.id === "string" &&
        typeof searchExper.data[0].member.display_name === "string",
    );
  }
}
