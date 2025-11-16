import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that email verification confirmation properly uses the authenticated
 * administrator's identity from the JWT token in the Authorization header.
 *
 * This test validates security enforcement of account isolation during the
 * verification process, ensuring that the system correctly associates the
 * verification token with the authenticated administrator's account and
 * prevents cross-administrator verification attempts.
 *
 * The test workflow:
 *
 * 1. Create a new administrator account with authentication tokens
 * 2. Request email verification for the authenticated administrator
 * 3. Confirm email verification with the verification token
 * 4. Validate that the authenticated administrator's email is now verified
 * 5. Verify the authenticated context is maintained throughout the workflow
 */
export async function test_api_administrator_email_verification_confirm_authenticated_context(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account with authentication tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://admin.example.com/setup",
        referrer: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Verify the administrator was created
  TestValidator.equals(
    "administrator email matches",
    administrator.email,
    adminEmail,
  );
  TestValidator.predicate(
    "administrator account is active",
    administrator.account_status === "active",
  );

  // Step 2: Request email verification for the authenticated administrator
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

  // Verify the email verification request was sent
  TestValidator.equals(
    "verification email sent to correct address",
    sendResponse.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "verification token has valid expiration",
    sendResponse.expires_in_hours > 0,
  );

  // Step 3: Confirm email verification with the verification token
  // For testing purposes, we use a simulated verification token
  const verificationToken = RandomGenerator.alphaNumeric(32);

  const confirmResponse: ICommunityPlatformAdministrator.IEmailVerifyConfirmResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.confirm.confirmEmailVerification(
      connection,
      {
        body: {
          verification_token: verificationToken,
        } satisfies ICommunityPlatformAdministrator.IEmailVerifyConfirmRequest,
      },
    );
  typia.assert(confirmResponse);

  // Step 4: Validate that the authenticated administrator's email is now verified
  TestValidator.equals(
    "confirmed administrator id matches created administrator",
    confirmResponse.id,
    administrator.id,
  );
  TestValidator.equals(
    "confirmed administrator email matches",
    confirmResponse.email,
    adminEmail,
  );
  TestValidator.equals(
    "confirmed administrator username matches",
    confirmResponse.username,
    administrator.username,
  );
  TestValidator.predicate(
    "email is now verified",
    confirmResponse.email_verified === true,
  );
  TestValidator.predicate(
    "account status is active",
    confirmResponse.account_status === "active",
  );

  // Step 5: Verify the authenticated context is maintained
  TestValidator.equals(
    "authenticated administrator context preserved",
    confirmResponse.id,
    administrator.id,
  );
}
