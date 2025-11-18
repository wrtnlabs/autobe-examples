import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_extremely_long_id(
  connection: api.IConnection,
) {
  // Create a new user account to establish system state
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "StrongPassword123!";

  const newUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(newUser);

  // Attempt to retrieve user with extremely long userId (10,000 characters)
  // This simulates a potential attack vector to trigger buffer overflow or DoS
  const extremelyLongId: string = ArrayUtil.repeat(10000, () => "a").join("");

  // Validate that the system properly rejects the extremely long identifier
  await TestValidator.error(
    "system must reject extremely long userId",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: extremelyLongId,
      });
    },
  );
}
