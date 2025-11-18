import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_account_creation_with_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create a guest user with a specific email address that will be duplicated
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const guestResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: duplicateEmail,
        href: RandomGenerator.paragraph(),
        referrer: RandomGenerator.paragraph(),
        ip: null,
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guestResponse);

  // Step 2: Create an authenticated user account with the exact same email address as the guest
  const userResponse: ITodoListUser =
    await api.functional.todoList.todo_list_users.create(connection, {
      body: {
        email: duplicateEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: RandomGenerator.paragraph(),
        referrer: RandomGenerator.paragraph(),
        ip: null,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userResponse);

  // Step 3: Attempt to create another guest user account with the same email
  // This should fail with a 409 Conflict error due to email uniqueness constraint
  await TestValidator.error(
    "duplicate email registration should fail with 409 Conflict",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: duplicateEmail,
          href: RandomGenerator.paragraph(),
          referrer: RandomGenerator.paragraph(),
          ip: null,
        } satisfies ITodoListGuest.IJoin,
      });
    },
  );
}
