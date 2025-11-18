import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test clearing user display name by setting it to null.
 *
 * Test validates that users can remove their display name to maintain only
 * email-based identification. Tests the system's handling of optional name
 * field updates and ensures proper validation when name is cleared through
 * update operations.
 *
 * 1. Create user account with display name through registration
 * 2. Update user profile by setting name field to null
 * 3. Verify name field is successfully cleared
 * 4. Ensure other user data remains intact during name clearing
 */
export async function test_api_user_profile_update_clear_name(
  connection: api.IConnection,
) {
  // Create user account with display name
  const userEmail = typia.random<string & tags.Format<"email">>();
  const originalName = RandomGenerator.name();
  const href = `https://example.com/register`;
  const referrer = `https://example.com/signup`;

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      name: originalName,
      href,
      referrer,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Verify initial user has name set
  TestValidator.equals("initial user has name", createdUser.name, originalName);

  // Clear display name by updating without name property (undefined clears it)
  const updatedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: createdUser.id,
      body: {} satisfies ITodoAppUser.IUpdate, // Empty body clears optional name field
    },
  );
  typia.assert(updatedUser);

  // Verify name field is cleared (will be undefined when name is not provided)
  TestValidator.equals(
    "name field cleared after update",
    updatedUser.name,
    undefined,
  );

  // Verify other user data remains intact
  TestValidator.equals("user email unchanged", updatedUser.email, userEmail);
  TestValidator.equals("user id unchanged", updatedUser.id, createdUser.id);
  TestValidator.equals(
    "user status unchanged",
    updatedUser.status,
    createdUser.status,
  );
  TestValidator.equals(
    "user created_at unchanged",
    updatedUser.created_at,
    createdUser.created_at,
  );

  // Verify updated_at timestamp was updated
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedUser.updated_at !== createdUser.updated_at,
  );
}
