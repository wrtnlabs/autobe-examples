import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test full-text search functionality for contributor suspensions.
 *
 * This test validates the ability to search suspension records by text content,
 * including contributor names, emails, and suspension reasons. A moderator
 * authenticates and performs searches for suspensions containing specific
 * keywords to verify that the search API returns only matching records.
 *
 * **Workflow:**
 *
 * 1. Create a moderator account with valid email, password, and username
 * 2. Authenticate the moderator (automatic token management via SDK)
 * 3. Perform text-based searches with various keywords ('spam', 'offensive',
 *    'repeat')
 * 4. Validate that search results contain only suspensions matching the search
 *    terms
 * 5. Verify pagination information in responses
 * 6. Test search behavior with different limit and page parameters
 * 7. Ensure response structure matches expected format
 */
export async function test_api_moderation_suspensions_search_by_text(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8) +
    RandomGenerator.alphaNumeric(1) +
    RandomGenerator.pick(["!", "@", "#", "$"] as const);
  const moderatorUsername =
    RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(5);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id.length > 0,
  );

  // Step 2: Search suspensions with keyword 'spam'
  const spamSearchResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          search: "spam",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(spamSearchResults);
  TestValidator.predicate(
    "spam search returns valid pagination",
    spamSearchResults.pagination.current > 0,
  );

  // Validate that results contain suspensions with 'spam' in reason
  if (spamSearchResults.data.length > 0) {
    const hasSpamMatch = spamSearchResults.data.some((suspension) =>
      suspension.reason.toLowerCase().includes("spam"),
    );
    TestValidator.predicate(
      "spam search results contain matching suspensions",
      hasSpamMatch || spamSearchResults.data.length === 0,
    );
  }

  // Step 3: Search suspensions with keyword 'offensive'
  const offensiveSearchResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          search: "offensive",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(offensiveSearchResults);
  TestValidator.predicate(
    "offensive search returns valid pagination",
    offensiveSearchResults.pagination.current > 0,
  );

  // Step 4: Search suspensions with keyword 'repeat'
  const repeatSearchResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          search: "repeat",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(repeatSearchResults);
  TestValidator.predicate(
    "repeat search returns valid pagination",
    repeatSearchResults.pagination.current > 0,
  );

  // Step 5: Test pagination with different page parameters
  const paginatedResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          search: "spam",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResults.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination has valid record count",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    paginatedResults.pagination.pages >= 0,
  );

  // Step 6: Search with empty/no results scenario (non-existent keyword)
  const noResultsSearch: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(20),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(noResultsSearch);
  TestValidator.predicate(
    "non-matching search returns valid pagination",
    noResultsSearch.pagination.current >= 1,
  );

  // Step 7: Verify response structure integrity
  if (spamSearchResults.data.length > 0) {
    const firstResult = spamSearchResults.data[0];
    TestValidator.predicate(
      "suspension has valid id",
      firstResult.id.length > 0,
    );
    TestValidator.predicate(
      "suspension has moderator info",
      firstResult.moderator !== null && firstResult.moderator !== undefined,
    );
    TestValidator.predicate(
      "suspension has valid suspension_type",
      ["posting_restriction", "account_suspension", "permanent_ban"].includes(
        firstResult.suspension_type,
      ),
    );
    TestValidator.predicate(
      "suspension has valid reason",
      firstResult.reason.length > 0,
    );
    TestValidator.predicate(
      "suspension has valid severity_level",
      ["minor", "moderate", "severe", "permanent"].includes(
        firstResult.severity_level,
      ),
    );
    TestValidator.predicate(
      "suspension has valid status",
      ["active", "lifted", "expired"].includes(firstResult.status),
    );
    TestValidator.predicate(
      "suspension has valid suspended_at timestamp",
      firstResult.suspended_at.length > 0,
    );
  }

  // Step 8: Test search with different limits
  const smallLimitResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          search: "spam",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(smallLimitResults);
  TestValidator.predicate(
    "small limit is respected",
    smallLimitResults.data.length <= 5,
  );

  const largeLimitResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          search: "spam",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(largeLimitResults);
  TestValidator.predicate(
    "large limit is capped at maximum",
    largeLimitResults.data.length <= 100,
  );
}
