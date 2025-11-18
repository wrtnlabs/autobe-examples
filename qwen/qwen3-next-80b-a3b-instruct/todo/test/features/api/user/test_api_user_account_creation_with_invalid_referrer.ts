import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_account_creation_with_invalid_referrer(
  connection: api.IConnection,
) {
  // Step 1: Create a guest user account to establish authentication context
  const guest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/home",
        referrer: "example[invalid]", // Invalid referrer URL
        ip: "192.168.1.1",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guest);

  // Step 2: Attempt to create a user account with invalid referrer (expected to fail)
  await TestValidator.error(
    "user account creation should fail with invalid referrer",
    async () => {
      await api.functional.todoList.todo_list_users.create(connection, {
        body: {
          email: guest.email,
          password: "SecurePass123!",
          ip: "192.168.1.1",
          href: "https://example.com/register",
          referrer: "example[invalid]", // Invalid referrer must trigger 400 error
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
