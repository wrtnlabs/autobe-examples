import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_account_update_email_format_invalid(
  connection: api.IConnection,
) {
  // 1. Register a new user account with valid email to establish authentication context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: RandomGenerator.paragraph({ sentences: 1 }),
        referrer: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Test failure condition: update email with invalid format (missing @ symbol)
  await TestValidator.error(
    "invalid email format (missing @ symbol) should fail",
    async () => {
      await api.functional.todoList.user.todo_list_users.update(connection, {
        userId: registeredUser.id,
        body: {
          email: "invalid-email-format", // missing @ symbol
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // 3. Test failure condition: update email with invalid format (missing domain)
  await TestValidator.error(
    "invalid email format (missing domain) should fail",
    async () => {
      await api.functional.todoList.user.todo_list_users.update(connection, {
        userId: registeredUser.id,
        body: {
          email: "invalid", // missing @ and domain
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // 4. Test failure condition: update email with invalid format (special characters not allowed)
  await TestValidator.error(
    "invalid email format (special characters not allowed) should fail",
    async () => {
      await api.functional.todoList.user.todo_list_users.update(connection, {
        userId: registeredUser.id,
        body: {
          email: "invalid.email#@!domain.com", // contains invalid special characters
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // 5. Test failure condition: update email with invalid format (empty string)
  await TestValidator.error("empty email string should fail", async () => {
    await api.functional.todoList.user.todo_list_users.update(connection, {
      userId: registeredUser.id,
      body: {
        email: "", // empty string
      } satisfies ITodoListUser.IUpdate,
    });
  });

  // 6. Test failure condition: update email with invalid format (whitespace only)
  await TestValidator.error("whitespace-only email should fail", async () => {
    await api.functional.todoList.user.todo_list_users.update(connection, {
      userId: registeredUser.id,
      body: {
        email: "   ", // whitespace only
      } satisfies ITodoListUser.IUpdate,
    });
  });
}
