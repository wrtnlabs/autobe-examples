import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test the moderator search functionality with text-based search queries.
 *
 * This test validates that the moderator search endpoint correctly filters
 * moderators based on text search queries. It creates multiple moderators with
 * distinctive usernames and email addresses, then performs various search
 * operations to verify:
 *
 * 1. Partial username matching works correctly
 * 2. Email address searching functions properly
 * 3. Case-insensitive searching is supported
 * 4. Only matching moderators are returned in results
 * 5. Pagination works correctly with search filters
 *
 * The test ensures that administrators can effectively search and find
 * moderators in the system, which is essential for moderator management and
 * oversight tasks.
 */
export async function test_api_moderator_search_with_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create moderators with distinctive usernames and emails for search testing
  const uniquePrefix = RandomGenerator.alphaNumeric(8);

  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: `${uniquePrefix}_alice@example.com`,
      password: "password123",
      username: `alice_${uniquePrefix}`,
      ip: "192.168.1.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: `${uniquePrefix}_bob@example.com`,
      password: "password123",
      username: `bob_${uniquePrefix}`,
      ip: "192.168.1.2",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: `${uniquePrefix}_charlie@example.com`,
      password: "password123",
      username: `charlie_${uniquePrefix}`,
      ip: "192.168.1.3",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator3);

  const moderator4 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: `${uniquePrefix}_alice_special@test.com`,
      password: "password123",
      username: `aliceinwonderland_${uniquePrefix}`,
      ip: "192.168.1.4",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator4);

  // Step 2: Authenticate as one of the moderators (already authenticated from join)
  // The join operation automatically sets the Authorization header

  // Step 3: Test search by partial username match
  const searchAlice =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "alice",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(searchAlice);

  // Verify that search results contain moderators with "alice" in username or email
  TestValidator.predicate(
    "search for 'alice' should return matching moderators",
    searchAlice.data.length >= 2,
  );

  const aliceResults = searchAlice.data.filter(
    (m) =>
      m.username.toLowerCase().includes("alice") ||
      m.email.toLowerCase().includes("alice"),
  );
  TestValidator.equals(
    "all results should match 'alice' search term",
    searchAlice.data.length,
    aliceResults.length,
  );

  // Step 4: Test search by specific username prefix
  const searchBob =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: `bob_${uniquePrefix}`,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(searchBob);

  TestValidator.predicate(
    "search for bob's username should return at least one result",
    searchBob.data.length >= 1,
  );

  const bobFound = searchBob.data.find((m) => m.id === moderator2.id);
  typia.assertGuard(bobFound!);
  TestValidator.equals(
    "bob moderator should be in search results",
    bobFound.username,
    moderator2.username,
  );

  // Step 5: Test search by email domain
  const searchExampleDomain =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "example.com",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(searchExampleDomain);

  TestValidator.predicate(
    "search for 'example.com' should return multiple moderators",
    searchExampleDomain.data.length >= 3,
  );

  // Step 6: Test case-insensitive search
  const searchUpperCase =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "CHARLIE",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(searchUpperCase);

  const charlieFound = searchUpperCase.data.find((m) => m.id === moderator3.id);
  typia.assertGuard(charlieFound!);
  TestValidator.equals(
    "case-insensitive search for 'CHARLIE' should find charlie moderator",
    charlieFound.username,
    moderator3.username,
  );

  // Step 7: Test search with pagination
  const searchWithPagination =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: uniquePrefix,
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(searchWithPagination);

  TestValidator.equals(
    "pagination limit should be respected",
    searchWithPagination.data.length,
    2,
  );

  TestValidator.predicate(
    "total records should indicate more results available",
    searchWithPagination.pagination.records >= 4,
  );

  // Step 8: Test search with no matches
  const searchNoMatch =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "nonexistent_moderator_xyz123",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(searchNoMatch);

  TestValidator.equals(
    "search with no matches should return empty results",
    searchNoMatch.data.length,
    0,
  );

  TestValidator.equals(
    "pagination should show zero records for no matches",
    searchNoMatch.pagination.records,
    0,
  );
}
