import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_account_creation_with_short_password(
  connection: api.IConnection,
) {
  // Step 1: Create a guest user account to establish authentication context
  const guestEmail: string = typia.random<string & tags.Format<"email">>();
  const guest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guest);

  // Step 2: Attempt to create an authenticated user account with a password shorter than the minimum required length (6 characters)
  // According to the scenario, the system should reject passwords with only 5 characters
  await TestValidator.error(
    "should reject password shorter than 6 characters",
    async () => {
      await api.functional.todoList.todo_list_users.create(connection, {
        body: {
          email: guestEmail,
          password: "12345", // 5-character password - too short
          href: "https://example.com/confirm",
          referrer: "https://example.com/signup",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
