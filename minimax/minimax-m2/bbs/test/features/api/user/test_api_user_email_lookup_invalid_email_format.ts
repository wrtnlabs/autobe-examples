import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test user email lookup with invalid email format validation.
 *
 * This test validates the API's email format validation by testing various
 * invalid email formats. The test creates a system administrator account for
 * authentication, then attempts to lookup users using improperly formatted
 * email addresses to ensure the API properly validates email format and returns
 * appropriate error responses.
 *
 * Test Strategy:
 *
 * 1. Create system administrator account for authentication
 * 2. Test multiple invalid email formats:
 *
 *    - Missing @ symbol (userdomain.com)
 *    - Multiple @ symbols (user@@domain.com)
 *    - Missing domain part (user@)
 *    - Invalid characters (!user@domain!.com)
 *    - Empty string
 *    - Just @ symbol
 *    - Invalid domain structure
 * 3. Validate that API returns proper error responses for each invalid format
 * 4. Ensure no invalid emails are processed successfully
 */
export async function test_api_user_email_lookup_invalid_email_format(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: "System Admin",
        email: adminEmail,
        status: "active",
        bio: "System administrator for testing email validation",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test various invalid email formats
  const invalidEmailFormats = [
    "userdomain.com", // Missing @ symbol
    "user@@domain.com", // Multiple @ symbols
    "user@", // Missing domain part
    "user@domain!.com", // Invalid characters in domain
    "", // Empty string
    "@", // Just @ symbol
    "user@", // Missing domain after @
    "user@.com", // Domain starting with dot
    "user@domain.", // Domain ending with dot
    "@domain.com", // Missing local part
    "user space@domain.com", // Space in email
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmailFormats) {
    await TestValidator.error(
      `should reject invalid email format: ${invalidEmail}`,
      async () => {
        await api.functional.users.email.at(connection, {
          email: invalidEmail as string & tags.Format<"email">,
        });
      },
    );
  }

  // Step 3: Verify that valid email format works (this should not throw an error)
  // Note: This may still fail if the user doesn't exist, but the format should be accepted
  try {
    await api.functional.users.email.at(connection, {
      email: "nonexistent@example.com" satisfies string & tags.Format<"email">,
    });
  } catch (error) {
    // It's expected that user doesn't exist, but format should be valid
    // The error should be about user not found, not email format
    TestValidator.predicate(
      "valid email format should be accepted (user may not exist)",
      error instanceof api.HttpError && error.status !== 400, // Not a bad request (format error)
    );
  }
}
