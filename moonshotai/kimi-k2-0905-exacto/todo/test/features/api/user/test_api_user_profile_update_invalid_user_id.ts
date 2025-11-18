import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test profile update attempt with invalid or non-existent user ID.
 *
 * Validates that the system properly rejects update requests for non-existent
 * user accounts and handles unauthorized update attempts with appropriate error
 * responses. Tests security measures preventing updates to arbitrary user
 * accounts across authentication boundaries.
 *
 * This performs a critical security test to ensure that users cannot update
 * profiles they don't own and that the system validates user identity against
 * the target user ID in the request path. Prevents malicious actors from
 * bypassing authorization checks to modify other users' profiles.
 *
 * Test Flow:
 *
 * 1. Create an authenticated user account for context
 * 2. Generate a completely different non-existent user ID
 * 3. Attempt to update the invalid user's profile with valid data
 * 4. Verify the system rejects this unauthorized cross-user operation
 * 5. Confirm authentication cannot override ownership validation
 *
 * @param connection Api connection for test execution
 */
export async function test_api_user_profile_update_invalid_user_id(
  connection: api.IConnection,
) {
  // Create a test user for authentication context
  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "security_password_123",
      href: "https://test.example.com/profile",
      referrer: "https://test.example.com/login",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(authenticatedUser);

  // Generate a random invalid/non-existent user ID that differs from authenticated user
  const invalidUserId = typia.random<string & tags.Format<"uuid">>();

  // Explicitly validate that we're attempting cross-user operation
  TestValidator.predicate(
    "authenticated user differs from target user ID",
    authenticatedUser.id !== invalidUserId,
  );

  // Attempt to update the non-existent/invalid user's profile with valid data
  await TestValidator.error(
    "should reject update of non-existent user ID",
    async () => {
      await api.functional.todoApp.user.users.update(connection, {
        userId: invalidUserId,
        body: {
          name: "Unauthorized Update Attempt",
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );
}
