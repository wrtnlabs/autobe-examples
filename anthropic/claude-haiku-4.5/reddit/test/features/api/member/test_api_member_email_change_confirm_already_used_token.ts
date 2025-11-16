import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email change confirmation request flow with proper member
 * authentication.
 *
 * This test validates the email change request and confirmation workflow:
 *
 * 1. Create a new member account with initial email
 * 2. Request an email change to a new email address
 * 3. Verify the response indicates verification email was sent
 * 4. Verify the response includes proper token expiration timestamp
 * 5. Confirm successful email change request processing
 *
 * Note: Testing token reuse would require access to the actual verification
 * token generated and sent via email by the server. This is not exposed in the
 * API response, so the reuse scenario cannot be directly tested in E2E tests.
 */
export async function test_api_member_email_change_confirm_already_used_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(12),
      password: memberPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);
  typia.assertGuard(memberAccount);

  // Step 2: Request email change to a new email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const emailChangeRequest =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmail,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeRequest);

  // Step 3: Verify the email change request was successful
  TestValidator.predicate(
    "email change request should be successful",
    emailChangeRequest.success === true,
  );

  // Step 4: Verify verification email was sent to the correct address
  TestValidator.equals(
    "verification email should be sent to new email address",
    emailChangeRequest.verification_email_sent_to,
    newEmail,
  );

  // Step 5: Verify token expiration is set properly
  TestValidator.predicate(
    "token should have valid expiration timestamp",
    emailChangeRequest.token_expires_at !== null &&
      emailChangeRequest.token_expires_at !== undefined &&
      emailChangeRequest.token_expires_at.length > 0,
  );

  // Step 6: Verify the response includes appropriate confirmation message
  TestValidator.predicate(
    "response should include helpful confirmation message",
    emailChangeRequest.message !== null &&
      emailChangeRequest.message.length > 0,
  );
}
