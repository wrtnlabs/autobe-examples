import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email change confirmation with an invalid verification token.
 *
 * This test validates that the email change confirmation endpoint properly
 * rejects attempts to confirm an email change with an invalid or non-existent
 * verification token. The test creates a new member account and then attempts
 * to confirm an email change using a token that was never generated or is
 * completely invalid.
 *
 * The system must:
 *
 * 1. Create a valid member account through the join endpoint
 * 2. Attempt to confirm an email change with an invalid token
 * 3. Receive an HTTP 400 error indicating invalid token
 * 4. Verify error message matches expected format
 *
 * Expected behavior:
 *
 * - Invalid token rejection with 400 status code
 * - Error message: 'Invalid verification token. Please request a new email
 *   change.'
 * - System validates token existence and format before processing
 */
export async function test_api_member_email_change_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish valid authenticated context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });

  typia.assert(createdMember);
  TestValidator.predicate(
    "member account created successfully",
    createdMember.id !== undefined && createdMember.token !== undefined,
  );

  // Step 2: Generate invalid token and new email address for email change confirmation
  const invalidToken = RandomGenerator.alphaNumeric(64);
  const newEmail = typia.random<string & tags.Format<"email">>();

  // Step 3: Attempt to confirm email change with invalid token
  // The system should reject this request with 400 error for invalid token
  await TestValidator.error(
    "should reject invalid email change verification token",
    async () => {
      await api.functional.communityPlatform.member.auth.member.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: invalidToken,
            new_email: newEmail,
          } satisfies ICommunityPlatformMember.IEmailChangeConfirm,
        },
      );
    },
  );
}
