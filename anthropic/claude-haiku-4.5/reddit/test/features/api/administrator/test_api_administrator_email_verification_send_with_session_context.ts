import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates email verification send operation with complete session context
 * metadata.
 *
 * This test verifies that when an administrator initiates an email verification
 * request, the system correctly captures and stores session metadata including
 * the page URL (href) and referrer information. This ensures proper audit trail
 * functionality for administrative action logging and compliance requirements.
 *
 * Test workflow:
 *
 * 1. Create a new administrator account with session context (href and optional
 *    referrer)
 * 2. Send an email verification request with complete session metadata
 * 3. Validate the response confirms successful email delivery
 * 4. Verify the response includes token expiration information
 */
export async function test_api_administrator_email_verification_send_with_session_context(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account with session context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://admin.example.com/admin/register",
        referrer: "https://example.com/login",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Send email verification request with complete session context
  const pageUrl = "https://admin.example.com/security/email-verify";
  const referrerUrl = "https://admin.example.com/dashboard";

  const verificationResponse: ICommunityPlatformAdministrator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          href: pageUrl,
          referrer: referrerUrl,
          ip: "192.168.1.100",
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(verificationResponse);

  // Step 3: Validate response confirms successful email delivery
  TestValidator.equals(
    "email sent to correct address",
    verificationResponse.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "response contains confirmation message",
    verificationResponse.message.length > 0,
  );

  // Step 4: Verify response includes token expiration information
  TestValidator.predicate(
    "token expiration is positive",
    verificationResponse.expires_in_hours > 0,
  );
  TestValidator.predicate(
    "expiration in reasonable range",
    verificationResponse.expires_in_hours <= 48,
  );
}
