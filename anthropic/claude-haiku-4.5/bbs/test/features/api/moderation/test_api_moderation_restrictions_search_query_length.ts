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
 * Test search parameter with various string lengths.
 *
 * This test validates that the search parameter length constraint is properly
 * enforced when querying account restrictions. The endpoint accepts search
 * queries up to 500 characters (as defined by MaxLength<500> in
 * IDiscussionBoardAccountRestriction.IRequest.search), and should reject
 * queries exceeding this limit.
 *
 * Test flow:
 *
 * 1. Authenticate as a moderator
 * 2. Test search with single character query (valid, minimum)
 * 3. Test search with typical keyword (valid, normal case)
 * 4. Test search with 500-character query (valid, maximum)
 * 5. Test search with 501+ character query (invalid, exceeds maximum)
 * 6. Validate that all valid searches return proper paginated results
 * 7. Validate that invalid search lengths are rejected
 */
export async function test_api_moderation_restrictions_search_query_length(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "Test@Password123",
        username: RandomGenerator.alphaNumeric(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test search with single character query (valid, minimum)
  const singleCharQuery = "a";
  const result1: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          search: singleCharQuery,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.predicate(
    "single character search should return valid paginated results",
    result1.pagination !== null && typeof result1.pagination === "object",
  );

  // Step 3: Test search with typical keyword (valid, normal case)
  const typicalKeyword = RandomGenerator.paragraph({ sentences: 1 });
  const result2: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          search: typicalKeyword,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.predicate(
    "typical keyword search should return valid paginated results",
    result2.pagination !== null && typeof result2.pagination === "object",
  );

  // Step 4: Test search with 500-character query (valid, maximum)
  const maxLengthQuery = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 50,
    sentenceMax: 60,
    wordMin: 2,
    wordMax: 3,
  }).substring(0, 500);

  const result3: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          search: maxLengthQuery,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.equals(
    "500-character search should have correct query length",
    maxLengthQuery.length,
    500,
  );
  TestValidator.predicate(
    "maximum length search should return valid paginated results",
    result3.pagination !== null && typeof result3.pagination === "object",
  );

  // Step 5: Test search with 501+ character query (invalid, exceeds maximum)
  const exceedsMaxQuery = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 60,
    sentenceMax: 70,
    wordMin: 2,
    wordMax: 3,
  }).substring(0, 501);

  await TestValidator.error(
    "search with 501+ characters should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.moderation.restrictions.index(
        connection,
        {
          body: {
            search: exceedsMaxQuery,
          } satisfies IDiscussionBoardAccountRestriction.IRequest,
        },
      );
    },
  );

  // Step 6: Validate pagination structure for valid searches
  TestValidator.equals(
    "pagination should have current property",
    typeof result1.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination should have limit property",
    typeof result1.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination should have records property",
    typeof result1.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination should have pages property",
    typeof result1.pagination.pages,
    "number",
  );

  // Step 7: Verify data array exists
  TestValidator.predicate(
    "result should contain data array",
    Array.isArray(result1.data),
  );
}
