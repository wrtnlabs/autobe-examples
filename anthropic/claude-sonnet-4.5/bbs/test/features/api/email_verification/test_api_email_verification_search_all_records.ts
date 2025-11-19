import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEmailVerification";

/**
 * Test that moderators can retrieve a paginated list of all email verification
 * records.
 *
 * This test validates the basic search functionality for email verification
 * records by authenticating as a moderator and requesting records with only
 * pagination parameters.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create multiple email verification records to populate searchable data
 * 3. Retrieve verification records using pagination (page and limit only)
 * 4. Validate pagination metadata (current, limit, records, pages)
 * 5. Verify verification record summaries are returned correctly
 */
export async function test_api_email_verification_search_all_records(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create multiple email verification records
  const verificationCount = 5;
  const createdVerifications: IDiscussionBoardEmailVerification[] =
    await ArrayUtil.asyncRepeat(verificationCount, async () => {
      const verification: IDiscussionBoardEmailVerification =
        await api.functional.discussionBoard.emailVerifications.create(
          connection,
          {
            body: {
              discussion_board_member_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              email: typia.random<string & tags.Format<"email">>(),
            } satisfies IDiscussionBoardEmailVerification.ICreate,
          },
        );
      typia.assert(verification);
      return verification;
    });

  // Step 3: Retrieve verification records with pagination only (no filters)
  const searchRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardEmailVerification.IRequest;

  const searchResponse: IPageIDiscussionBoardEmailVerification.ISummary =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResponse);

  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    searchResponse.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 10",
    searchResponse.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination records should be at least the number created",
    searchResponse.pagination.records >= verificationCount,
  );

  TestValidator.predicate(
    "pagination pages should be at least 1",
    searchResponse.pagination.pages >= 1,
  );

  // Step 5: Validate data array is not empty
  TestValidator.predicate(
    "data array should not be empty",
    searchResponse.data.length > 0,
  );

  // Verify at least some of our created verifications appear in the results
  const createdIds = createdVerifications.map((v) => v.id);
  const returnedIds = searchResponse.data.map((v) => v.id);
  const foundCount = createdIds.filter((id) => returnedIds.includes(id)).length;

  TestValidator.predicate(
    "at least some created verifications should appear in search results",
    foundCount > 0,
  );
}
