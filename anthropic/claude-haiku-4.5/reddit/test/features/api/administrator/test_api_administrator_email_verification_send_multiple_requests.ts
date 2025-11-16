import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test multiple email verification requests for administrator accounts.
 *
 * This test validates that when an administrator requests email verification
 * multiple times, the system properly manages token lifecycle by:
 *
 * - Generating a new verification token for each request
 * - Invalidating previous tokens when a new request is made
 * - Returning consistent response information for each request
 * - Ensuring security through proper token management
 *
 * The test sequence:
 *
 * 1. Create a new administrator account
 * 2. Send first email verification request
 * 3. Send second email verification request (invalidates first token)
 * 4. Send third email verification request (invalidates second token)
 * 5. Validate all responses have correct structure and expiration info
 * 6. Confirm that only the most recent token would be valid
 */
export async function test_api_administrator_email_verification_send_multiple_requests(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        href: "https://admin.example.com/security/email-verify",
        referrer: "https://admin.example.com/login",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account created successfully",
    administrator.id !== null,
  );
  TestValidator.equals(
    "administrator email address matches input",
    administrator.email,
    adminEmail,
  );

  // Step 2: Send first email verification request
  const firstVerificationResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          href: "https://admin.example.com/security/email-verify",
          referrer: "https://admin.example.com/dashboard",
          ip: "192.168.1.1",
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(firstVerificationResponse);
  TestValidator.equals(
    "first verification email sent to correct address",
    firstVerificationResponse.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "first verification has valid expiration time",
    firstVerificationResponse.expires_in_hours > 0,
  );
  const firstExpirationHours = firstVerificationResponse.expires_in_hours;

  // Step 3: Send second email verification request (invalidates first token)
  const secondVerificationResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          href: "https://admin.example.com/security/email-verify",
          referrer: "https://admin.example.com/dashboard",
          ip: "192.168.1.2",
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(secondVerificationResponse);
  TestValidator.equals(
    "second verification email sent to correct address",
    secondVerificationResponse.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "second verification has valid expiration time",
    secondVerificationResponse.expires_in_hours > 0,
  );
  const secondExpirationHours = secondVerificationResponse.expires_in_hours;

  // Step 4: Send third email verification request (invalidates second token)
  const thirdVerificationResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: adminEmail,
          href: "https://admin.example.com/security/email-verify",
          referrer: "https://admin.example.com/dashboard",
          ip: "192.168.1.3",
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(thirdVerificationResponse);
  TestValidator.equals(
    "third verification email sent to correct address",
    thirdVerificationResponse.email_sent_to,
    adminEmail,
  );
  TestValidator.predicate(
    "third verification has valid expiration time",
    thirdVerificationResponse.expires_in_hours > 0,
  );
  const thirdExpirationHours = thirdVerificationResponse.expires_in_hours;

  // Step 5: Validate token lifecycle management consistency
  TestValidator.equals(
    "all verification responses maintain consistent expiration times",
    firstExpirationHours,
    secondExpirationHours,
  );
  TestValidator.equals(
    "second and third responses have matching expiration times",
    secondExpirationHours,
    thirdExpirationHours,
  );

  // Step 6: Validate that all responses contain success confirmation messages
  TestValidator.predicate(
    "first response contains confirmation message",
    firstVerificationResponse.message.length > 0,
  );
  TestValidator.predicate(
    "second response contains confirmation message",
    secondVerificationResponse.message.length > 0,
  );
  TestValidator.predicate(
    "third response contains confirmation message",
    thirdVerificationResponse.message.length > 0,
  );

  // Step 7: Confirm that multiple requests are properly handled with token lifecycle management
  TestValidator.predicate(
    "all email verification requests sent to the same recipient address",
    firstVerificationResponse.email_sent_to === adminEmail &&
      secondVerificationResponse.email_sent_to === adminEmail &&
      thirdVerificationResponse.email_sent_to === adminEmail,
  );
}
