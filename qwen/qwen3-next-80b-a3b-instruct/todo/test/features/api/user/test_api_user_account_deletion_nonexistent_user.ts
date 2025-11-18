import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test attempting to delete a nonexistent user account.
 *
 * This scenario validates the system's error handling for invalid user
 * identifiers. The test first authenticates a new user, then attempts to delete
 * a non-existent user account using a validly formatted UUID that does not
 * correspond to any existing user in the database. The system must raise an
 * error indicating the requested resource does not exist, rather than
 * successfully deleting an account.
 *
 * Business context: This test ensures the integrity of user account management
 * by preventing false confirmation of deletions and ensuring proper error
 * reporting for non-existent resources.
 *
 * Steps:
 *
 * 1. Authenticate and create a new user account
 * 2. Generate a valid UUID that does not exist in the database
 * 3. Attempt to delete the non-existent user account
 * 4. Verify the system raises an error for non-existent resource
 */
export async function test_api_user_account_deletion_nonexistent_user(
  connection: api.IConnection,
) {
  // Step 1: Authenticate and create a new user account
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate a valid UUID that does not exist in the database
  const nonExistentUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to delete the non-existent user account
  // This should result in an error
  await TestValidator.error(
    "attempt to delete nonexistent user should raise an error",
    async () => {
      await api.functional.todoList.user.todo_list_users.erase(connection, {
        userId: nonExistentUserId,
      });
    },
  );
}
