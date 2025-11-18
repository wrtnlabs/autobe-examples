import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_user_password_change_secure(
  connection: api.IConnection,
) {
  // 1. Create a new user account (join) with random email and name
  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
      } satisfies ITodoListTodoListUser.ICreate,
    });
  typia.assert(user);

  // 2. Change password securely with currentPassword and newPassword
  const newPassword = RandomGenerator.alphaNumeric(12); // 12-char alphanumeric
  await api.functional.auth.user.password.change.changePassword(connection, {
    body: {
      currentPassword: "1234", // assuming initial password is "1234"
      newPassword: newPassword,
    } satisfies ITodoListTodoListUser.IChangePassword,
  });
}
