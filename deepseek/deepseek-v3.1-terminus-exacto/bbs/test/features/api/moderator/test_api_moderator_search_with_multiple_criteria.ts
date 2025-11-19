import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test advanced moderator search combining multiple filtering criteria
 * simultaneously. This test validates complex search operations that combine
 * username pattern matching, specific moderation level filtering, and custom
 * sorting preferences. The test ensures that the search endpoint properly
 * handles compound queries and returns accurate paginated results that match
 * all specified criteria while maintaining performance and data integrity.
 */
export async function test_api_moderator_search_with_multiple_criteria(
  connection: api.IConnection,
) {
  // Create multiple test moderators with varying characteristics
  const moderators = await ArrayUtil.asyncRepeat(5, async (index) => {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: `test_moderator_${index}${RandomGenerator.alphabets(3)}`,
        password: "password123",
        display_name: `Moderator ${index}`,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        moderation_level: RandomGenerator.pick([
          "basic",
          "senior",
          "admin",
        ] as const),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(moderator);
    return moderator;
  });

  // Test 1: Search by moderation level with exact match
  const basicSearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          moderation_level: "basic",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(basicSearch);

  // Validate that all returned moderators have the correct moderation level
  TestValidator.predicate(
    "all returned moderators should have basic level",
    basicSearch.data.every((mod) => mod.moderation_level === "basic"),
  );

  // Test 2: Search with partial username pattern matching
  const usernameSearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "test_moderator",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(usernameSearch);

  // Test 3: Combined search with multiple criteria
  const combinedSearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "test",
          moderation_level: "senior",
          sort_by: "username",
          order: "asc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Validate that combined search returns only senior moderators with 'test' in username
  TestValidator.predicate(
    "combined search should return only senior moderators",
    combinedSearch.data.every(
      (mod) =>
        mod.moderation_level === "senior" && mod.username.includes("test"),
    ),
  );

  // Test 4: Sorting validation
  const sortedSearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortedSearch);

  // Validate sorting order (most recent first) only if we have multiple items
  if (sortedSearch.data.length > 1) {
    TestValidator.predicate(
      "results should be sorted by creation date descending",
      sortedSearch.data.every((mod, index, array) => {
        if (index === 0) return true;
        const currentDate = new Date(mod.created_at);
        const previousDate = new Date(array[index - 1].created_at);
        return currentDate <= previousDate;
      }),
    );
  }

  // Test 5: Pagination validation
  const paginatedSearch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(paginatedSearch);

  TestValidator.equals(
    "pagination should return correct number of items",
    paginatedSearch.data.length,
    2,
  );

  TestValidator.predicate(
    "pagination metadata should be accurate",
    paginatedSearch.pagination.current === 1 &&
      paginatedSearch.pagination.limit === 2 &&
      paginatedSearch.pagination.pages >= 1,
  );
}
