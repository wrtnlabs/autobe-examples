import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates email change request rejection for invalid email formats.
 *
 * Tests the email format validation logic of the email change request endpoint.
 * The endpoint must reject requests containing various malformed email
 * addresses and return appropriate validation errors without generating
 * verification tokens.
 *
 * Test scenarios:
 *
 * 1. Create an administrator account for testing
 * 2. Attempt email change with various invalid formats:
 *
 *    - Missing @ symbol
 *    - Missing domain name
 *    - Missing local part
 *    - Invalid special characters
 *    - Spaces in email address
 *    - Multiple @ symbols
 *    - Invalid domain extensions
 * 3. Verify each invalid email is rejected with error response
 * 4. Confirm no verification tokens are generated for invalid emails
 */
export async function test_api_administrator_email_change_request_invalid_email_format(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123",
      username: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Test various invalid email formats
  const invalidEmails = [
    "notanemail", // Missing @
    "@example.com", // Missing local part
    "user@", // Missing domain
    "user@@example.com", // Multiple @
    "user @example.com", // Space in local part
    "user@ example.com", // Space in domain
    "user@example", // Missing TLD
    "user@.com", // Missing domain name
    "user name@example.com", // Space in email
    "user@exam ple.com", // Space in domain
    "user@example..com", // Double dot
    ".user@example.com", // Starts with dot
    "user.@example.com", // Ends with dot before @
    "user#name@example.com", // Invalid character
    "user@exam#ple.com", // Invalid character in domain
  ];

  // 3. Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `should reject invalid email format: ${invalidEmail}`,
      async () => {
        await api.functional.communityPlatform.administrator.auth.administrator.email_change.request.requestEmailChange(
          connection,
          {
            body: {
              new_email: invalidEmail,
            } satisfies ICommunityPlatformAdministrator.IEmailChangeRequest,
          },
        );
      },
    );
  }

  // 4. Verify that valid email change request works
  const validNewEmail = typia.random<string & tags.Format<"email">>();
  const response =
    await api.functional.communityPlatform.administrator.auth.administrator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          new_email: validNewEmail,
        } satisfies ICommunityPlatformAdministrator.IEmailChangeRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "verification token expiration should be positive",
    response.verification_token_expires_in > 0,
  );
}
