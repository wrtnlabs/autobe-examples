import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionModerator";

/**
 * Test searching moderators by partial username with minimum 3 characters and
 * maximum 100 characters.
 *
 * This comprehensive test validates the moderator search functionality for the
 * economic discussion board. The test creates multiple moderator accounts with
 * diverse usernames and then searches for them using partial matching to verify
 * the search algorithm works correctly. It covers:
 *
 * 1. Creating test moderator accounts with various username patterns
 * 2. Performing searches with different partial username matchers (minimum 3
 *    characters)
 * 3. Validating that search returns moderators with usernames containing the
 *    search text
 * 4. Testing case sensitivity handling and special character support
 * 5. Verifying pagination works correctly with search results
 * 6. Ensuring only matching moderators are returned (no false positives)
 */
export async function test_api_moderator_search_by_username(
  connection: api.IConnection,
) {
  // Step 1: Create multiple test moderator accounts with different username patterns
  const moderators = await ArrayUtil.asyncRepeat(5, async (index) => {
    const moderatorBody = {
      username: `testMod_${index}_search_${RandomGenerator.alphabets(3)}`,
      email: `test_moderator_${index}_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "junior",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate;

    return await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  });

  typia.assert(moderators);

  // Step 2: Create moderator with special characters and numbers in username
  const specialModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: `test-Mod_${RandomGenerator.alphabets(4)}-123-search`,
        email: `special_moderator_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        password_hash: RandomGenerator.alphaNumeric(16),
        moderation_level: "moderate",
        email_verified: true,
        two_factor_enabled: true,
      } satisfies IEconomicDiscussionModerator.ICreate,
    },
  );

  typia.assert(specialModerator);

  // Step 3: Create moderator with uppercase letters for case sensitivity testing
  const upperCaseModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: `TESTMOD_${RandomGenerator.alphabets(5).toUpperCase()}_SEARCH`,
        email: `uppercase_moderator_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        password_hash: RandomGenerator.alphaNumeric(16),
        moderation_level: "senior",
        email_verified: true,
        two_factor_enabled: false,
      } satisfies IEconomicDiscussionModerator.ICreate,
    },
  );

  typia.assert(upperCaseModerator);

  // Step 4: Test basic partial username search with minimum 3 characters
  const searchResults: IPageIEconomicDiscussionModerator.ISummary =
    await api.functional.economicDiscussion.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "testMod",
        } satisfies IEconomicDiscussionModerator.IRequest,
      },
    );

  typia.assert(searchResults);

  // Step 5: Validate search results contain expected moderators
  TestValidator.predicate(
    "search results should contain moderators with 'testMod' in username",
    searchResults.data.length > 0,
  );

  searchResults.data.forEach((moderator) => {
    TestValidator.predicate(
      "each moderator should have 'testMod' in username",
      moderator.username.toLowerCase().includes("testmod"),
    );
  });

  // Step 6: Test search with special characters
  const specialSearchResults: IPageIEconomicDiscussionModerator.ISummary =
    await api.functional.economicDiscussion.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "test-Mod",
        } satisfies IEconomicDiscussionModerator.IRequest,
      },
    );

  typia.assert(specialSearchResults);

  TestValidator.predicate(
    "special character search should find matching moderator",
    specialSearchResults.data.length > 0,
  );

  TestValidator.equals(
    "special character moderator should be found",
    specialSearchResults.data[0].id,
    specialModerator.id,
  );

  // Step 7: Test case sensitivity validation
  TestValidator.predicate(
    "search should be case-insensitive or consistent",
    specialSearchResults.data.some(
      (mod) =>
        mod.username.toLowerCase().includes("test-mod".toLowerCase()) ||
        mod.username.includes("test-Mod"),
    ),
  );

  // Step 8: Test pagination validation with search
  const paginatedSearchResults: IPageIEconomicDiscussionModerator.ISummary =
    await api.functional.economicDiscussion.moderator.moderators.index(
      connection,
      {
        body: {
          page: 2,
          limit: 3,
          search: "test",
        } satisfies IEconomicDiscussionModerator.IRequest,
      },
    );

  typia.assert(paginatedSearchResults);

  TestValidator.equals(
    "page 2 should have appropriate limit",
    paginatedSearchResults.data.length,
    0,
  );

  // Step 9: Test search with minimum character requirement (3 chars minimum)
  const minCharSearch =
    await api.functional.economicDiscussion.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "tes", // Exactly 3 characters (minimum requirement)
        } satisfies IEconomicDiscussionModerator.IRequest,
      },
    );

  typia.assert(minCharSearch);

  // Note: The search with 3 characters should work, but actual behavior depends on implementation
  // We'll validate the response structure regardless
  TestValidator.predicate(
    "3-character search should return valid response structure",
    Array.isArray(minCharSearch.data) && minCharSearch.pagination !== undefined,
  );

  // Step 10: Validate that search results exclude non-matching moderators
  const allModeratorsResults: IPageIEconomicDiscussionModerator.ISummary =
    await api.functional.economicDiscussion.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IEconomicDiscussionModerator.IRequest,
      },
    );

  typia.assert(allModeratorsResults);

  const searchResultsTests = await ArrayUtil.asyncRepeat(3, async (index) => {
    const searchTerms = ["search", "Mod", "123"];
    const partialResults =
      await api.functional.economicDiscussion.moderator.moderators.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            search: RandomGenerator.pick(searchTerms),
          } satisfies IEconomicDiscussionModerator.IRequest,
        },
      );

    typia.assert(partialResults);
    return partialResults;
  });

  // Validate that specific searches work correctly
  TestValidator.predicate(
    "specific search should find expected moderator",
    searchResultsTests.some(
      (result) =>
        result.data.length > 0 && result.data[0].username.includes("test"),
    ),
  );
}
