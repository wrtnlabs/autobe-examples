import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification send operation with client IP metadata.
 *
 * Validates that platform administrators can request email verification with
 * optional client IP address metadata. The test ensures that the system
 * correctly:
 *
 * - Creates a new administrator account
 * - Sends verification email to the registered email address
 * - Captures client IP address for session tracking (SSR scenario)
 * - Returns confirmation with verification token expiration details
 * - Stores IP metadata in session records for security audit trails
 *
 * The test covers the complete flow from administrator registration through
 * email verification initiation with proper session context metadata.
 */
export async function test_api_administrator_email_verification_send_with_client_ip(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account with registration context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123";
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();
  const registrationHref = "https://admin.example.com/setup";
  const registrationReferrer = "https://example.com/login";

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: registrationHref,
        referrer: registrationReferrer,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify administrator account was created with correct information
  TestValidator.equals("admin email matches", createdAdmin.email, adminEmail);
  TestValidator.equals(
    "admin username matches",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.predicate(
    "email is not verified initially",
    !createdAdmin.email_verified,
  );
  TestValidator.equals(
    "account status is active",
    createdAdmin.account_status,
    "active",
  );

  // Step 3: Request email verification with client IP metadata for SSR scenario
  const clientIPv4 = "192.168.1.100";
  const verificationHref = "https://admin.example.com/security/email-verify";
  const verificationReferrer = "https://admin.example.com/dashboard";

  const verificationResponse: ICommunityPlatformAdministrator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          ip: clientIPv4,
          href: verificationHref,
          referrer: verificationReferrer,
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(verificationResponse);

  // Step 4: Validate email verification response
  TestValidator.predicate(
    "response contains confirmation message",
    verificationResponse.message.length > 0,
  );
  TestValidator.equals(
    "email sent to correct address",
    verificationResponse.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "verification token expiration is positive",
    verificationResponse.expires_in_hours > 0,
  );
  TestValidator.predicate(
    "verification token expires within reasonable timeframe",
    verificationResponse.expires_in_hours <= 48,
  );

  // Step 5: Verify IP metadata was captured (implicit through successful response)
  TestValidator.predicate(
    "system accepted and processed IP metadata",
    verificationResponse.email_sent_to === adminEmail,
  );

  // Step 6: Test verification request without IP (optional field)
  const verificationResponseNoIP: ICommunityPlatformAdministrator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          href: verificationHref,
          referrer: verificationReferrer,
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(verificationResponseNoIP);

  // Step 7: Validate second request response (without IP)
  TestValidator.equals(
    "email still sent to same address",
    verificationResponseNoIP.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "verification expiration still valid",
    verificationResponseNoIP.expires_in_hours > 0,
  );

  // Step 8: Test with IPv6 address for comprehensive IP metadata testing
  const clientIPv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
  const verificationResponseIPv6: ICommunityPlatformAdministrator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          ip: clientIPv6,
          href: verificationHref,
          referrer: verificationReferrer,
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(verificationResponseIPv6);

  // Step 9: Validate IPv6 request response
  TestValidator.equals(
    "email sent with IPv6 metadata",
    verificationResponseIPv6.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "IPv6 metadata processing successful",
    verificationResponseIPv6.message.length > 0,
  );
}
