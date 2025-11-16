import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test email verification confirmation with missing token field.
 *
 * Validates that the email verification confirmation endpoint properly enforces
 * required field validation. When a confirmation request is submitted without
 * providing the token field, the system should return a validation error.
 *
 * Process:
 *
 * 1. Create a moderator account to establish email verification context
 * 2. Attempt to confirm email verification without token field
 * 3. Verify that the API returns a validation error for missing token
 * 4. Confirm that the moderator's email remains unverified
 */
export async function test_api_moderator_email_verification_confirm_missing_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account as context for email verification test
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Verify moderator account was created but email is not verified
  TestValidator.predicate(
    "moderator email should not be verified initially",
    moderator.email_verified === false,
  );

  // Step 2: Attempt to confirm email verification without providing token field
  await TestValidator.error(
    "email verification should fail when token field is missing",
    async () => {
      await api.functional.communityPlatform.auth.moderator.email_verify.confirm(
        connection,
        {
          body: {} satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
        },
      );
    },
  );

  // Step 3: Verify that moderator email remains unverified after failed confirmation
  TestValidator.predicate(
    "moderator email should still be unverified after failed confirmation",
    moderator.email_verified === false,
  );
}
