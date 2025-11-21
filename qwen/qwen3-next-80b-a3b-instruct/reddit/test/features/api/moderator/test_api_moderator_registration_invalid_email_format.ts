import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test moderator registration with invalid email format
  // Validate that system rejects registration with malformed email addresses
  // This ensures only RFC 5322 compliant emails can create moderator accounts

  // Use various invalid email formats to test validation
  const invalidEmails = [
    "invalid-email", // Missing @
    "@domain.com", // Missing local part
    "user@", // Missing domain
    "user@domain", // Missing top-level domain
    "user name@domain.com", // Contains space
    "user..name@domain.com", // Consecutive dots
    "user@domain..com", // Consecutive dots in domain
    "user@domain.com.", // Ends with dot
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `moderator registration should reject invalid email format: ${invalidEmail}`,
      async () => {
        await api.functional.auth.moderator.join(connection, {
          body: invalidEmail satisfies ICommunityBBSModerator.ICreate,
        });
      },
    );
  }
}
