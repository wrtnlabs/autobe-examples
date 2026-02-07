import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test edge cases where search results should be empty for moderation history.
 * Create a super administrator account and perform searches with filters that
 * should return no results, such as searching for content types that don't exist,
 * moderators that haven't performed any actions, date ranges with no moderation
 * activity, or text searches with no matches. Verify that the system correctly
 * returns empty data arrays with proper pagination metadata (total records = 0,
 * pages = 0) and that the response structure remains consistent even with no results.
 */
export async function test_api_moderation_history_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account and get authenticated connection
  const superAdminAuth = await authorize_super_admin_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create authenticated super admin connection
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${superAdminAuth.token.access}` },
  };
  // Test 1: Search for non-existent content type
  const nonExistentContentType =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          content_type: "non_existent_type",
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(nonExistentContentType);
  // Test 2: Search with non-existent moderator admin ID
  const nonExistentModerator =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          moderator_admin_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(nonExistentModerator);
  // Test 3: Search with non-existent moderator super admin ID
  const nonExistentSuperModerator =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          moderator_super_admin_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(nonExistentSuperModerator);
  // Test 4: Search with specific moderation reason that doesn't exist
  const nonExistentReason =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          moderation_reason: "non_existent_reason_that_will_never_match",
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(nonExistentReason);
  // Test 5: Search with specific original content that doesn't exist
  const nonExistentContent =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          original_content: "non_existent_content_that_will_never_match",
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(nonExistentContent);
  // Test 6: Search with future date range (no moderation activity)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const futureSearch =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          created_at_start: futureDate,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(futureSearch);
  // Test 7: Search with specific search term that doesn't match anything
  const nonMatchingSearch =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          search: "non_matching_search_term_that_will_never_exist",
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  // Test 8: Combined filters that guarantee no results
  const combinedFilters =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          content_type: "article",
          moderator_admin_id: typia.random<string & tags.Format<"uuid">>(),
          moderation_reason: "non_existent_reason",
          created_at_start: futureDate,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Test 9: Verify pagination structure with empty results
  const paginatedEmpty =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          content_type: "non_existent_type",
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(paginatedEmpty);
  // Validate all empty results have consistent structure
  const allResults = [
    nonExistentContentType,
    nonExistentModerator,
    nonExistentSuperModerator,
    nonExistentReason,
    nonExistentContent,
    futureSearch,
    nonMatchingSearch,
    combinedFilters,
    paginatedEmpty,
  ];
  for (const result of allResults) {
    TestValidator.equals("empty data array", result.data.length, 0);
    TestValidator.equals("total records is 0", result.pagination.records, 0);
    TestValidator.equals("pages is 0", result.pagination.pages, 0);
    TestValidator.predicate(
      "pagination structure is valid",
      result.pagination.current >= 0 && result.pagination.limit >= 0,
    );
  }
  // Additional validation for paginated case
  TestValidator.equals(
    "paginated current page",
    paginatedEmpty.pagination.current,
    1,
  );
  TestValidator.equals("paginated limit", paginatedEmpty.pagination.limit, 10);
}
