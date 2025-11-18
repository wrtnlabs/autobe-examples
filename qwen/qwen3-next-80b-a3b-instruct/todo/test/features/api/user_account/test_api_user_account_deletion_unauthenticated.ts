import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_account_deletion_unauthenticated(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through the join endpoint
  // This establishes the user who will be targeted for unauthenticated deletion
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: RandomGenerator.paragraph({ sentences: 1 }),
        referrer: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Attempt to delete the user account without authentication
  // This is an unauthenticated request, so it should fail with a 401 error
  // The API endpoint is designed to require authentication for deletion
  await TestValidator.error(
    "unauthenticated user deletion should fail with 401",
    async () => {
      await api.functional.todoList.user.todo_list_users.erase(connection, {
        userId: user.id,
      });
    },
  );

  // Step 3: Verify the user account still exists (should not be deleted)
  // Since deletion was unauthenticated and failed, account should remain active
  const verification: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user.email,
        password: RandomGenerator.alphaNumeric(12),
        href: RandomGenerator.paragraph({ sentences: 1 }),
        referrer: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(verification);
  TestValidator.equals(
    "user account still exists after failed deletion attempt",
    user.id,
    verification.id,
  );
}
