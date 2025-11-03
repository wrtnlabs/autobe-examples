import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test tag-based article search when a tag exists but has no articles.
 *
 * This test validates the system's ability to handle empty result sets
 * gracefully when searching for articles by a tag that exists but has never
 * been applied to any articles. This scenario is common for newly created tags
 * or rarely used taxonomy entries.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator
 * 2. Create an unused tag
 * 3. Create a category for baseline setup
 * 4. Search for articles by the unused tag
 * 5. Verify empty results with correct pagination metadata
 */
export async function test_api_tag_article_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a tag that will not be associated with any articles
  const unusedTag = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: typia.random<string & tags.MinLength<2> & tags.MaxLength<30>>(),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(unusedTag);

  // Step 3: Create a category for baseline system setup
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          description: typia.random<
            (string & tags.MaxLength<2000>) | null | undefined
          >(),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Search for articles by the unused tag slug
  const searchResults =
    await api.functional.discussionBoard.tags.articles.index(connection, {
      tagSlug: unusedTag.slug,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResults);

  // Step 5: Verify empty results array
  TestValidator.equals(
    "search results data should be empty array",
    searchResults.data,
    [],
  );

  // Step 6: Validate pagination metadata reflects zero articles
  TestValidator.equals(
    "total records should be zero",
    searchResults.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be zero",
    searchResults.pagination.pages,
    0,
  );

  TestValidator.predicate(
    "current page should be valid for empty results",
    searchResults.pagination.current >= 0,
  );

  TestValidator.equals(
    "limit should match request",
    searchResults.pagination.limit,
    20,
  );
}
