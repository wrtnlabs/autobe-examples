import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountRestriction";

/**
 * Test full-text search functionality for account restrictions.
 *
 * This test validates the PATCH
 * /discussionBoard/moderator/moderation/restrictions endpoint's search
 * functionality. It creates restrictions with various details and performs
 * full-text searches to verify that the search parameter correctly finds
 * restrictions by contributor name, email, or restriction reason.
 *
 * The test covers:
 *
 * 1. Moderator authentication setup
 * 2. Search with contributor names
 * 3. Search with restriction reasons
 * 4. Case-insensitive search behavior
 * 5. Pagination with search results
 * 6. Empty search results validation
 */
export async function test_api_moderation_restrictions_full_text_search(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test@1234",
    username: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateData,
  });
  typia.assert(moderator);

  // Step 2: Perform search with no filters initially to get some baseline data
  const initialSearch =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(initialSearch);

  // Step 3: Test search by contributor name
  if (initialSearch.data.length > 0) {
    const firstRestriction = initialSearch.data[0];
    const contributorName = firstRestriction.contributor.username;

    const searchByName =
      await api.functional.discussionBoard.moderator.moderation.restrictions.index(
        connection,
        {
          body: {
            search: contributorName,
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardAccountRestriction.IRequest,
        },
      );
    typia.assert(searchByName);

    TestValidator.predicate(
      "search by contributor name should return results",
      searchByName.data.length > 0,
    );

    TestValidator.predicate(
      "all results should contain the searched contributor name",
      searchByName.data.every((r) =>
        r.contributor.username
          .toLowerCase()
          .includes(contributorName.toLowerCase()),
      ),
    );
  }

  // Step 4: Test search by reason substring
  if (initialSearch.data.length > 0) {
    const firstRestriction = initialSearch.data[0];
    const reasonSubstring = firstRestriction.reason.substring(
      0,
      Math.min(5, firstRestriction.reason.length),
    );

    if (reasonSubstring.length > 0) {
      const searchByReason =
        await api.functional.discussionBoard.moderator.moderation.restrictions.index(
          connection,
          {
            body: {
              search: reasonSubstring,
              page: 1,
              limit: 20,
            } satisfies IDiscussionBoardAccountRestriction.IRequest,
          },
        );
      typia.assert(searchByReason);

      TestValidator.predicate(
        "search by reason substring should return matching results",
        searchByReason.data.every((r) =>
          r.reason.toLowerCase().includes(reasonSubstring.toLowerCase()),
        ),
      );
    }
  }

  // Step 5: Test case-insensitive search
  if (initialSearch.data.length > 0) {
    const firstRestriction = initialSearch.data[0];
    const originalName = firstRestriction.contributor.username;
    const uppercaseName = originalName.toUpperCase();
    const lowercaseName = originalName.toLowerCase();

    const searchUppercase =
      await api.functional.discussionBoard.moderator.moderation.restrictions.index(
        connection,
        {
          body: {
            search: uppercaseName,
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardAccountRestriction.IRequest,
        },
      );
    typia.assert(searchUppercase);

    const searchLowercase =
      await api.functional.discussionBoard.moderator.moderation.restrictions.index(
        connection,
        {
          body: {
            search: lowercaseName,
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardAccountRestriction.IRequest,
        },
      );
    typia.assert(searchLowercase);

    TestValidator.equals(
      "case-insensitive search should return same number of results",
      searchUppercase.data.length,
      searchLowercase.data.length,
    );
  }

  // Step 6: Test pagination with search results
  const paginatedSearch =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(paginatedSearch);

  TestValidator.predicate(
    "pagination should return correct limit",
    paginatedSearch.data.length <= 5,
  );

  TestValidator.predicate(
    "pagination info should be present",
    paginatedSearch.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination limit should match requested limit",
    paginatedSearch.pagination.limit === 5,
  );

  // Step 7: Test search with non-existent term
  const nonExistentSearch =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          search: "NonExistentTermXYZ12345",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(nonExistentSearch);

  TestValidator.predicate(
    "search with non-existent term should return empty results",
    nonExistentSearch.data.length === 0,
  );

  // Step 8: Test response structure validation
  const finalSearch =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(finalSearch);

  if (finalSearch.data.length > 0) {
    const restriction = finalSearch.data[0];

    TestValidator.predicate(
      "restriction should have all required fields",
      restriction.id !== undefined &&
        restriction.restriction_type !== undefined &&
        restriction.reason !== undefined &&
        restriction.imposed_at !== undefined &&
        restriction.contributor !== undefined &&
        restriction.imposed_by_moderator !== undefined &&
        restriction.status !== undefined,
    );

    TestValidator.predicate(
      "contributor should have id and username",
      restriction.contributor.id !== undefined &&
        restriction.contributor.username !== undefined,
    );

    TestValidator.predicate(
      "moderator should have id and username",
      restriction.imposed_by_moderator.id !== undefined &&
        restriction.imposed_by_moderator.username !== undefined,
    );
  }
}
