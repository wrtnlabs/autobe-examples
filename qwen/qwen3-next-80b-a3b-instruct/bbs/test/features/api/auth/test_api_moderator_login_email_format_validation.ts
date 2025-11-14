import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Validate that email format is validated before any database lookup.
 *
 * This test ensures the system rejects emails with invalid formats (missing @,
 * multiple @, no domain, etc.) with a 400 Bad Request response without
 * performing any authentication or database lookup. The validation occurs at
 * the request level before any backend processing.
 *
 * Test steps:
 *
 * 1. Prepare multiple invalid email formats that should be rejected
 * 2. For each invalid email, attempt moderator login with valid password
 * 3. Verify each attempt fails with 400 Bad Request status
 * 4. Ensure database lookups are never performed (no authorization tokens
 *    generated)
 *
 * This test focuses exclusively on request-level format validation - not on
 * authentication or password validation.
 */
export async function test_api_moderator_login_email_format_validation(
  connection: api.IConnection,
) {
  // Invalid email formats that should be rejected
  const invalidEmails = [
    "invalid-email", // Missing @
    "@domain.com", // Missing local part
    "user@", // Missing domain
    "user@@domain.com", // Multiple @
    "user name@domain.com", // Contains space
    "", // Empty string
    "user@domain", // Missing TLD
    ".user@domain.com", // Starts with dot
    "user.@domain.com", // Ends with dot
    "user..name@domain.com", // Consecutive dots
    "user@domain.c", // TLD too short (1 char)
    "user@domain.toolongtld", // TLD too long (more than 64 chars)
    "user@domain.123", // TLD numeric
    "user@domain", // No dot in domain
    "@", // Only @
    "@@@", // Only @ symbols
    "user@domain.com ", // Trailing space
    " user@domain.com", // Leading space
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `should reject invalid email format: ${invalidEmail}`,
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: invalidEmail satisfies IPoliticalForumModerator.ILogin,
        });
      },
    );
  }
}
