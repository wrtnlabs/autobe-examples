import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that administrators can retrieve profiles for multiple different users
 * sequentially.
 *
 * This test validates that admin access is not limited to specific users but
 * applies universally across all user accounts in the system. It creates
 * several user accounts and verifies that a single admin can access all of them
 * without restrictions.
 *
 * Test Flow:
 *
 * 1. Create three distinct user accounts with unique credentials
 * 2. Create an administrator account with system-wide privileges
 * 3. Use admin credentials to retrieve each user's profile sequentially
 * 4. Validate that each retrieval returns the correct user data matching the
 *    requested userId
 * 5. Confirm that administrative privileges apply universally across all user
 *    accounts
 */
export async function test_api_admin_user_profile_multiple_users(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user1Email,
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user1);

  // Step 2: Create second user account
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user2Email,
        password: "password456",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user2);

  // Step 3: Create third user account
  const user3Email = typia.random<string & tags.Format<"email">>();
  const user3: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user3Email,
        password: "password789",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user3);

  // Step 4: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminpass123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 5: Retrieve first user's profile using admin credentials
  const retrievedUser1: ITodoListUser =
    await api.functional.todoList.admin.users.at(connection, {
      userId: user1.id,
    });
  typia.assert(retrievedUser1);
  TestValidator.equals("first user ID matches", retrievedUser1.id, user1.id);
  TestValidator.equals(
    "first user email matches",
    retrievedUser1.email,
    user1Email,
  );

  // Step 6: Retrieve second user's profile using admin credentials
  const retrievedUser2: ITodoListUser =
    await api.functional.todoList.admin.users.at(connection, {
      userId: user2.id,
    });
  typia.assert(retrievedUser2);
  TestValidator.equals("second user ID matches", retrievedUser2.id, user2.id);
  TestValidator.equals(
    "second user email matches",
    retrievedUser2.email,
    user2Email,
  );

  // Step 7: Retrieve third user's profile using admin credentials
  const retrievedUser3: ITodoListUser =
    await api.functional.todoList.admin.users.at(connection, {
      userId: user3.id,
    });
  typia.assert(retrievedUser3);
  TestValidator.equals("third user ID matches", retrievedUser3.id, user3.id);
  TestValidator.equals(
    "third user email matches",
    retrievedUser3.email,
    user3Email,
  );
}
