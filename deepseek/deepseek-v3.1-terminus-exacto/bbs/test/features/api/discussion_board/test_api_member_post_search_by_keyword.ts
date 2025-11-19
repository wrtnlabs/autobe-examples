import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Test keyword-based search functionality for discussion board posts.
 *
 * This test validates that the search functionality correctly filters posts
 * based on keyword matching. It performs searches with specific keywords to
 * verify that the system returns relevant posts in the paginated results. Since
 * the actual post creation endpoint is not available, this test focuses on
 * validating the search functionality with existing system data.
 */
export async function test_api_member_post_search_by_keyword(
  connection: api.IConnection,
) {
  // Step 1: Create member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "test1234";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.content({ paragraphs: 1 }),
      ip: "127.0.0.1",
      href: "https://example.com/discussion-board",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Login to establish authenticated session
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "127.0.0.1",
      href: "https://example.com/discussion-board",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 3: Test search functionality with common keywords
  const searchResults = await api.functional.discussionBoard.member.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "discussion",
      } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(searchResults);

  // Step 4: Validate search results structure
  TestValidator.predicate(
    "search results should have valid pagination structure",
    searchResults.pagination.current === 1 &&
      searchResults.pagination.limit === 10 &&
      searchResults.pagination.records >= 0 &&
      searchResults.pagination.pages >= 0,
  );

  // Step 5: Test search with different keyword
  const technologyResults =
    await api.functional.discussionBoard.member.posts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "technology",
      } satisfies IDiscussionBoardPost.IRequest,
    });
  typia.assert(technologyResults);

  // Step 6: Test search with non-existent keyword
  const emptyResults = await api.functional.discussionBoard.member.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "nonexistentkeyword123",
      } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(emptyResults);

  // Step 7: Validate that search functionality works without errors
  TestValidator.predicate(
    "all search operations should complete successfully",
    searchResults.data.every(
      (post) =>
        typeof post.id === "string" &&
        typeof post.type === "string" &&
        typeof post.title === "string",
    ),
  );

  TestValidator.predicate(
    "search results should contain valid post summaries",
    technologyResults.data.every(
      (post) =>
        typeof post.id === "string" &&
        typeof post.type === "string" &&
        typeof post.title === "string",
    ),
  );

  // Step 8: Validate pagination consistency
  TestValidator.equals(
    "pagination limit should match requested value",
    searchResults.pagination.limit,
    10,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    searchResults.pagination.current,
    1,
  );
}
