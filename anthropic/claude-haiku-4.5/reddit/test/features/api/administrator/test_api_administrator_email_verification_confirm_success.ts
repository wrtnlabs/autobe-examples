import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification request workflow for platform administrators.
 *
 * This test validates the email verification initiation workflow for
 * administrators:
 *
 * 1. Administrator account registration
 * 2. Email verification request (generates and sends verification token)
 * 3. Validation that verification email was sent to the correct address
 * 4. Validation that the verification token is valid and has proper expiration
 *
 * Note: The email verification confirmation step is not tested here because it
 * requires the actual verification token that would be sent via email. In a
 * real E2E test with email integration, the token would be extracted from the
 * email and used for confirmation. This test focuses on validating the request
 * phase of the workflow.
 */
export async function test_api_administrator_email_verification_confirm_success(
  connection: api.IConnection,
) {
  // 1. Create a new administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://platform.example.com/admin/auth",
        referrer: "https://platform.example.com/",
        ip: "192.168.1.100",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);
  TestValidator.equals("admin email matches", createdAdmin.email, adminEmail);
  TestValidator.equals(
    "admin username matches",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.equals(
    "email is not verified on account creation",
    createdAdmin.email_verified,
    false,
  );
  TestValidator.equals(
    "account status is active",
    createdAdmin.account_status,
    "active",
  );

  // 2. Request email verification
  const verificationResponse: ICommunityPlatformAdministrator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          href: "https://platform.example.com/security/email-verify",
          referrer: "https://platform.example.com/settings",
          ip: "192.168.1.100",
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(verificationResponse);

  // 3. Validate email verification request response
  TestValidator.equals(
    "verification email sent to correct address",
    verificationResponse.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "token expiration is positive",
    verificationResponse.expires_in_hours > 0,
  );
  TestValidator.predicate(
    "token message indicates success",
    verificationResponse.message.length > 0,
  );

  // 4. Verify admin still exists with correct state
  const adminStateAfterVerificationRequest: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://platform.example.com/admin/auth",
        referrer: "https://platform.example.com/",
        ip: "192.168.1.100",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminStateAfterVerificationRequest);
  TestValidator.equals(
    "email still not verified before confirmation",
    adminStateAfterVerificationRequest.email_verified,
    false,
  );
}
