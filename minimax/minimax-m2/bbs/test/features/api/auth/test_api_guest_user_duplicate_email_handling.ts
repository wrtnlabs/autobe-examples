import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";

/**
 * Test guest user registration with duplicate email address. Validates that the
 * system properly prevents duplicate user accounts and returns appropriate
 * error response for existing email addresses. Ensures email uniqueness
 * constraint is enforced at the database level.
 *
 * The test creates an initial guest user with a specific email address, then
 * attempts to register a second user with the identical email. The system
 * should reject the second registration attempt with an appropriate error
 * message, demonstrating that email uniqueness is properly enforced at the
 * database level. This validates the data integrity constraint and ensures that
 * duplicate email addresses cannot be created in the guest user system.
 */
export async function test_api_guest_user_duplicate_email_handling(
  connection: api.IConnection,
) {
  // Create first user with a specific email
  const testEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.guestUser.join(connection, {
    body: {
      display_name: RandomGenerator.name(),
      email: testEmail,
      bio: "First user with this email",
    } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
  });
  typia.assert(firstUser);

  // Validate first user creation was successful
  TestValidator.equals(
    "first user created successfully",
    firstUser.email,
    testEmail,
  );

  // Attempt to create second user with the same email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.guestUser.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: testEmail, // Same email as first user
        bio: "Second user with duplicate email",
      } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
    });
  });
}
