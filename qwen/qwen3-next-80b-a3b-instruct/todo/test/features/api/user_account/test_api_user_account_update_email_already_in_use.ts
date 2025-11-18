import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_account_update_email_already_in_use(
  connection: api.IConnection,
) {
  // Step 1: Create first user with unique email
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create second user with different email
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: "password456",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 3: Attempt to update first user's email to second user's email
  // This should fail with 409 Conflict error due to email uniqueness constraint
  await TestValidator.error("cannot update to already-used email", async () => {
    await api.functional.todoList.user.todo_list_users.update(connection, {
      userId: firstUser.id,
      body: {
        email: secondUserEmail, // Attempting to reuse second user's email
      } satisfies ITodoListUser.IUpdate,
    });
  });
}
