import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_account_creation_with_invalid_email(
  connection: api.IConnection,
): Promise<void> {
  const validGuestEmail = typia.random<string & tags.Format<"email">>();
  const guest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: validGuestEmail,
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guest);

  // Attempt to register user with invalid email format (missing @ symbol)
  const invalidEmail = "invalid-email"; // No @ symbol - invalid email format
  await TestValidator.httpError(
    "should reject with 400 Bad Request for invalid email format",
    400,
    async () => {
      await api.functional.todoList.todo_list_users.create(connection, {
        body: {
          email: invalidEmail,
          password: "test123",
          href: "https://example.com/signup",
          referrer: "https://example.com/",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
