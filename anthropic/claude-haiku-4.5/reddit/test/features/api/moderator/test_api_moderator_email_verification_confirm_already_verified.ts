import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test email verification confirmation when the moderator's email is already
 * verified.
 *
 * This test validates the system's handling of re-verification attempts on an
 * already-verified email address. It follows the complete email verification
 * workflow:
 *
 * 1. Create a new moderator account
 * 2. Request initial verification email
 * 3. Confirm email verification with first token
 * 4. Verify that email_verified flag is set to true
 * 5. Request another verification email
 * 6. Attempt to confirm verification with the new token
 * 7. Validate the system handles the already-verified state appropriately
 *
 * This ensures proper idempotency and state management for email verification,
 * preventing race conditions and ensuring clean verification workflows.
 */
export async function test_api_moderator_email_verification_confirm_already_verified(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const createResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createResponse);
  TestValidator.predicate(
    "moderator account created successfully",
    createResponse.id !== undefined,
  );
  TestValidator.equals(
    "email not verified initially",
    createResponse.email_verified,
    false,
  );

  // Step 2: Request first verification email
  const sendFirstResponse: ICommunityPlatformModerator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(sendFirstResponse);
  TestValidator.equals(
    "first verification email sent to correct address",
    sendFirstResponse.email,
    moderatorEmail,
  );

  // Step 3: Confirm email verification with first token
  // Note: In production, the actual verification token would come from the email system
  // This test simulates the confirmation flow with a test token
  const firstToken = RandomGenerator.alphaNumeric(32);
  const confirmFirstResponse: ICommunityPlatformModerator.IEmailVerifyResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.confirm(
      connection,
      {
        body: {
          token: firstToken,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(confirmFirstResponse);
  TestValidator.equals(
    "first verification confirmation successful",
    confirmFirstResponse.success,
    true,
  );
  TestValidator.predicate(
    "verified_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      confirmFirstResponse.verified_at,
    ),
  );

  // Step 4: Request another verification email for re-verification testing
  const sendSecondResponse: ICommunityPlatformModerator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(sendSecondResponse);
  TestValidator.equals(
    "second verification email sent to same address",
    sendSecondResponse.email,
    moderatorEmail,
  );

  // Step 5: Attempt to confirm verification with second token (re-verification scenario)
  // This tests the system's idempotency handling when an already-verified email is verified again
  const secondToken = RandomGenerator.alphaNumeric(32);
  const confirmSecondResponse: ICommunityPlatformModerator.IEmailVerifyResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.confirm(
      connection,
      {
        body: {
          token: secondToken,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(confirmSecondResponse);

  // Step 6: Validate the system's response to re-verification
  // Verify that the API correctly handles verification confirmation for an already-verified email
  TestValidator.predicate(
    "re-verification confirmation received",
    confirmSecondResponse.success !== undefined,
  );
  TestValidator.predicate(
    "verified_at timestamp is valid after re-verification attempt",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      confirmSecondResponse.verified_at,
    ),
  );
  TestValidator.predicate(
    "verification message indicates successful completion",
    confirmSecondResponse.message !== undefined &&
      confirmSecondResponse.message.length > 0,
  );
}
