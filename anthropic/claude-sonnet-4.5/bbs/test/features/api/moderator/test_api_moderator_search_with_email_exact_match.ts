import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test moderator search using exact email address matching.
 *
 * This test validates that the email filter field in moderator search performs
 * exact matching rather than partial matching. It creates multiple moderator
 * accounts with different email addresses, then searches using exact email
 * values to verify that only the moderator with the matching email is
 * returned.
 *
 * Test workflow:
 *
 * 1. Create multiple moderator accounts with distinct email addresses
 * 2. Search using exact email match - verify single correct result
 * 3. Search with non-existent email - verify empty results
 * 4. Validate case-insensitive email matching
 * 5. Confirm pagination metadata reflects single result correctly
 */
export async function test_api_moderator_search_with_email_exact_match(
  connection: api.IConnection,
) {
  // Step 1: Create multiple moderator accounts with distinct emails
  const moderatorEmails = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];

  const createdModerators: IDiscussionBoardModerator.IAuthorized[] = [];

  for (const email of moderatorEmails) {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: email,
        password: typia.random<string>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(moderator);
    createdModerators.push(moderator);
  }

  // Step 2: Search using exact email - should return only one matching moderator
  const targetEmail = moderatorEmails[0];
  const exactMatchResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          email: targetEmail,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(exactMatchResult);

  // Verify exactly one result returned
  TestValidator.equals(
    "exact email match returns single result",
    exactMatchResult.data.length,
    1,
  );

  // Verify the returned moderator has the correct email
  TestValidator.equals(
    "returned moderator email matches search email",
    exactMatchResult.data[0].email,
    targetEmail,
  );

  // Verify pagination shows single result
  TestValidator.equals(
    "pagination records shows 1",
    exactMatchResult.pagination.records,
    1,
  );

  // Step 3: Search with non-existent email - should return empty results
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const emptyResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(emptyResult);

  TestValidator.equals(
    "non-existent email returns empty results",
    emptyResult.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records shows 0 for non-existent email",
    emptyResult.pagination.records,
    0,
  );

  // Step 4: Verify case-insensitive matching
  const upperCaseEmail = moderatorEmails[1].toUpperCase();
  const caseInsensitiveResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          email: upperCaseEmail as string & tags.Format<"email">,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);

  TestValidator.equals(
    "case-insensitive email search returns result",
    caseInsensitiveResult.data.length,
    1,
  );

  TestValidator.equals(
    "case-insensitive match returns correct moderator",
    caseInsensitiveResult.data[0].email.toLowerCase(),
    moderatorEmails[1].toLowerCase(),
  );
}
