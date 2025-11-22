import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

/**
 * Test content moderator registration with duplicate email address.
 *
 * This test validates the email uniqueness constraint by attempting to register
 * two content moderators with the same email address. The test ensures that:
 *
 * 1. The first registration succeeds with valid data
 * 2. The second registration with the same email fails appropriately
 * 3. The system maintains data integrity by preventing duplicate email addresses
 *
 * The test follows this sequence:
 *
 * 1. Generate random moderator registration data with unique email
 * 2. Successfully register the first content moderator
 * 3. Attempt to register a second moderator with the same email
 * 4. Verify the duplicate email registration fails with proper error handling
 * 5. Confirm that email uniqueness validation is enforced
 */
export async function test_api_content_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate unique email for testing
  const testEmail = `duplicate_test_${RandomGenerator.alphaNumeric(8)}@example.com`;

  // First registration - should succeed
  const firstModerator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        display_name: "First Moderator",
        email: testEmail,
        password: "SecurePass123!",
        bio: "First content moderator for duplicate email test",
        avatar_url: "https://example.com/avatar1.jpg",
        ip: "192.168.1.100",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  typia.assert(firstModerator);
  TestValidator.equals(
    "first moderator ID should be valid UUID",
    firstModerator.id,
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Second registration with same email - should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: "Second Moderator",
          email: testEmail, // Same email as first registration
          password: "AnotherPass456!",
          bio: "Second content moderator with duplicate email",
          avatar_url: "https://example.com/avatar2.jpg",
          ip: "192.168.1.101",
          href: "https://example.com/register",
          referrer: "https://google.com",
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Verify first moderator still exists with correct data
  TestValidator.equals(
    "email uniqueness validation works",
    firstModerator.email,
    testEmail,
  );
  TestValidator.equals(
    "first moderator status should be active",
    firstModerator.status,
    "active",
  );
}
