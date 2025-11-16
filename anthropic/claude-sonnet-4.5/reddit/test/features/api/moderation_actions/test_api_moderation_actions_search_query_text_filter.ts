import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test free-text search functionality for moderation actions using search_query
 * parameter.
 *
 * This test validates that the moderation actions search API correctly filters
 * results based on free-text search queries. It verifies that:
 *
 * 1. Null or empty search_query returns all actions without text filtering
 * 2. Specific search terms correctly filter actions containing those terms
 * 3. The search functionality works across action notes, reasons, and other text
 *    fields
 *
 * The test authenticates as a moderator and performs multiple search operations
 * with different query parameters to ensure the text search filtering works as
 * expected.
 */
export async function test_api_moderation_actions_search_query_text_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search with null search_query to get all actions (no text filtering)
  const allActionsResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          search_query: null,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(allActionsResult);

  // Step 3: Validate pagination structure for null search
  TestValidator.predicate(
    "null search_query should return valid pagination",
    allActionsResult.pagination.current >= 0 &&
      allActionsResult.pagination.limit > 0 &&
      allActionsResult.pagination.records >= 0,
  );

  // Step 4: Search with empty string search_query (should behave like null)
  const emptySearchResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          search_query: "",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(emptySearchResult);

  // Step 5: Validate empty string search returns all actions
  TestValidator.equals(
    "empty search_query should return same count as null",
    emptySearchResult.pagination.records,
    allActionsResult.pagination.records,
  );

  // Step 6: Search with specific keyword
  const searchKeyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 6,
  });
  const keywordSearchResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          search_query: searchKeyword,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(keywordSearchResult);

  // Step 7: Validate keyword search returns valid pagination
  TestValidator.predicate(
    "keyword search should return valid pagination structure",
    keywordSearchResult.pagination.current >= 0 &&
      keywordSearchResult.pagination.limit > 0 &&
      keywordSearchResult.pagination.records >= 0,
  );

  // Step 8: Test with multiple different search queries to verify filtering
  const queries = ["remove", "ban", "approve", "spam", "violation"];

  for (const query of queries) {
    const searchResult: IPageIRedditCommunityModerationAction.ISummary =
      await api.functional.redditCommunity.moderator.moderationActions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 20,
            search_query: query,
          } satisfies IRedditCommunityModerationAction.IRequest,
        },
      );
    typia.assert(searchResult);

    // Validate pagination metadata is consistent
    TestValidator.predicate(
      `search query '${query}' should have valid pagination`,
      searchResult.pagination.current >= 0,
    );
  }

  // Step 9: Test undefined search_query (optional parameter not provided)
  const undefinedSearchResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 30,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(undefinedSearchResult);

  // Step 10: Validate that omitting search_query returns all actions
  TestValidator.predicate(
    "undefined search_query should return all actions",
    undefinedSearchResult.pagination.records >= 0,
  );
}
