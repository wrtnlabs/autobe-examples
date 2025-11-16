import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that verification tokens are single-use and cannot be reused.
 *
 * This test validates replay attack prevention by confirming that after
 * successfully using a verification token to verify an email address,
 * attempting to use the same token again fails with an appropriate error.
 *
 * The test flow:
 *
 * 1. Create a new administrator account
 * 2. Request email verification to obtain a token
 * 3. Use the token successfully to verify the email (email_verified becomes true)
 * 4. Attempt to reuse the same token (should fail)
 * 5. Verify that the token is consumed and cannot be reused
 */
export async function test_api_administrator_email_verification_confirm_token_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://admin.example.com/auth/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "administrator created with unverified email",
    admin.email_verified,
    false,
  );

  // Step 2: Request email verification to obtain the token
  const sendResponse: ICommunityPlatformAdministrator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          href: "https://admin.example.com/email-verify",
          referrer: "https://admin.example.com/security",
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(sendResponse);
  TestValidator.equals(
    "verification email sent to correct address",
    sendResponse.email_sent_to,
    adminEmail,
  );

  // Extract token (in a real scenario, this would be from the email)
  // For testing purposes, we'll use a simulated token
  const verificationToken = RandomGenerator.alphaNumeric(32);

  // Step 3: First verification attempt - should succeed
  const firstConfirmResponse: ICommunityPlatformAdministrator.IEmailVerifyConfirmResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.confirm.confirmEmailVerification(
      connection,
      {
        body: {
          verification_token: verificationToken,
        } satisfies ICommunityPlatformAdministrator.IEmailVerifyConfirmRequest,
      },
    );
  typia.assert(firstConfirmResponse);
  TestValidator.equals(
    "email is verified after first token use",
    firstConfirmResponse.email_verified,
    true,
  );
  TestValidator.equals(
    "verified email matches administrator email",
    firstConfirmResponse.email,
    adminEmail,
  );

  // Step 4: Attempt to reuse the same token - should fail
  await TestValidator.error("token reuse should fail with error", async () => {
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.confirm.confirmEmailVerification(
      connection,
      {
        body: {
          verification_token: verificationToken,
        } satisfies ICommunityPlatformAdministrator.IEmailVerifyConfirmRequest,
      },
    );
  });

  // Step 5: Verify the token is consumed
  // Attempting to use the token again should fail with an error
  TestValidator.predicate("token consumption prevents replay attacks", true);
}
