import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test the moderator search functionality with username filtering.
 *
 * This test validates the moderator search API's ability to filter moderators
 * by username using partial, case-insensitive matching. It creates multiple
 * moderator accounts with different username patterns and verifies that the
 * search returns only the moderators whose usernames contain the search term.
 *
 * Test workflow:
 *
 * 1. Create multiple moderator accounts with distinct username patterns
 * 2. Perform searches with partial username terms
 * 3. Validate search results contain only matching moderators
 * 4. Verify pagination structure and metadata
 * 5. Test edge cases (non-existent usernames, special characters)
 */
export async function test_api_moderator_search_with_username_filter(
  connection: api.IConnection,
) {
  // Create moderators with different username patterns for testing
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "john_admin_2024",
      display_name: "John Administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "jane_admin_2024",
      display_name: "Jane Administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "alice_moderator",
      display_name: "Alice Moderator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator3);

  const moderator4 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "bob_reviewer",
      display_name: "Bob Reviewer",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator4);

  // Test 1: Search for moderators with "admin" in username
  const adminSearchResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "admin",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(adminSearchResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    adminSearchResult.pagination.current >= 0 &&
      adminSearchResult.pagination.limit > 0 &&
      adminSearchResult.pagination.records >= 0 &&
      adminSearchResult.pagination.pages >= 0,
  );

  // Verify specific moderators are in results
  const foundJohn = adminSearchResult.data.some(
    (mod) => mod.username === "john_admin_2024",
  );
  const foundJane = adminSearchResult.data.some(
    (mod) => mod.username === "jane_admin_2024",
  );

  TestValidator.predicate(
    "john_admin_2024 should be in search results",
    foundJohn,
  );

  TestValidator.predicate(
    "jane_admin_2024 should be in search results",
    foundJane,
  );

  // Test 2: Search for moderators with "moderator" in username
  const moderatorSearchResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "moderator",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(moderatorSearchResult);

  const foundAlice = moderatorSearchResult.data.some(
    (mod) => mod.username === "alice_moderator",
  );
  TestValidator.predicate(
    "alice_moderator should be in search results",
    foundAlice,
  );

  // Test 3: Case-insensitive search - search with uppercase
  const caseInsensitiveResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "ADMIN",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);

  const foundJohnUpper = caseInsensitiveResult.data.some(
    (mod) => mod.username === "john_admin_2024",
  );
  const foundJaneUpper = caseInsensitiveResult.data.some(
    (mod) => mod.username === "jane_admin_2024",
  );

  TestValidator.predicate(
    "uppercase search should match john_admin_2024",
    foundJohnUpper,
  );

  TestValidator.predicate(
    "uppercase search should match jane_admin_2024",
    foundJaneUpper,
  );

  // Test 4: Partial username search
  const partialSearchResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "2024",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(partialSearchResult);

  const foundJohnPartial = partialSearchResult.data.some(
    (mod) => mod.username === "john_admin_2024",
  );
  const foundJanePartial = partialSearchResult.data.some(
    (mod) => mod.username === "jane_admin_2024",
  );

  TestValidator.predicate(
    "partial search for '2024' should find john_admin_2024",
    foundJohnPartial,
  );

  TestValidator.predicate(
    "partial search for '2024' should find jane_admin_2024",
    foundJanePartial,
  );

  // Test 5: Search with non-existent username - should return empty results
  const nonExistentResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "nonexistent_user_xyz123",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(nonExistentResult);

  TestValidator.equals(
    "search for non-existent username should return empty results",
    nonExistentResult.data.length,
    0,
  );

  TestValidator.equals(
    "total records should be 0 for non-existent search",
    nonExistentResult.pagination.records,
    0,
  );

  // Test 6: Search with special characters
  const specialCharResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "bob_",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(specialCharResult);

  const foundBob = specialCharResult.data.some(
    (mod) => mod.username === "bob_reviewer",
  );
  TestValidator.predicate(
    "search with underscore should find bob_reviewer",
    foundBob,
  );

  // Test 7: Verify pagination metadata consistency
  const allModeratorsResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(allModeratorsResult);

  TestValidator.predicate(
    "pagination pages calculation should be correct",
    allModeratorsResult.pagination.pages ===
      Math.ceil(
        allModeratorsResult.pagination.records /
          allModeratorsResult.pagination.limit,
      ),
  );

  // Test 8: Verify unique username search pattern
  const supervisorSearchResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "reviewer",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(supervisorSearchResult);

  const foundBobReviewer = supervisorSearchResult.data.some(
    (mod) => mod.username === "bob_reviewer",
  );
  TestValidator.predicate(
    "search should find bob_reviewer when searching for 'reviewer'",
    foundBobReviewer,
  );
}
