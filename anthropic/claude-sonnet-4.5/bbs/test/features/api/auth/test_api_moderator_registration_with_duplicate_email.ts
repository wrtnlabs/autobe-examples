import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with duplicate email to verify email uniqueness
 * enforcement.
 *
 * This test validates that the discussion board system properly enforces email
 * uniqueness constraints during moderator registration. Email addresses must be
 * unique across all moderator accounts to ensure proper authentication, account
 * recovery, and audit trail integrity.
 *
 * Test workflow:
 *
 * 1. Generate unique test data for the first moderator registration
 * 2. Create the first moderator account successfully with a specific email
 * 3. Validate the first registration response structure and authentication tokens
 * 4. Attempt to create a second moderator with a different username but the same
 *    email
 * 5. Verify the system rejects the duplicate email registration with an error
 * 6. Test case-insensitive email validation by attempting with different case
 *
 * This ensures the system prevents:
 *
 * - Account duplication through email reuse
 * - Circumvention of account restrictions through case variations
 * - Data integrity violations
 * - Authentication and authorization conflicts
 */
export async function test_api_moderator_registration_with_duplicate_email(
  connection: api.IConnection,
) {
  // Generate random email that will be used for both registration attempts
  const sharedEmail = typia.random<string & tags.Format<"email">>();

  // Step 1: Create the first moderator account successfully
  const firstUsername = RandomGenerator.alphaNumeric(8);
  const firstPassword = RandomGenerator.alphaNumeric(10);

  const firstModeratorData = {
    username: firstUsername,
    email: sharedEmail,
    password: firstPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: firstModeratorData,
    });

  // Validate the first registration succeeded
  typia.assert(firstModerator);

  // Verify the returned data matches what we sent
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    firstUsername,
  );
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    sharedEmail,
  );

  // Step 2: Attempt to register a second moderator with the same email (exact match)
  const secondUsername = RandomGenerator.alphaNumeric(8);
  const secondPassword = RandomGenerator.alphaNumeric(10);

  const secondModeratorData = {
    username: secondUsername,
    email: sharedEmail, // Same email as first moderator (duplicate)
    password: secondPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 3: Verify that duplicate email registration fails
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: secondModeratorData,
      });
    },
  );

  // Step 4: Test case-insensitive email uniqueness validation
  const thirdUsername = RandomGenerator.alphaNumeric(8);
  const thirdPassword = RandomGenerator.alphaNumeric(10);
  const caseVariantEmail = sharedEmail.toUpperCase();

  const thirdModeratorData = {
    username: thirdUsername,
    email: caseVariantEmail, // Same email but different case
    password: thirdPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 5: Verify case-insensitive duplicate detection
  await TestValidator.error(
    "case-variant duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: thirdModeratorData,
      });
    },
  );
}
