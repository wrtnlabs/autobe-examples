import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_null_user_id(
  connection: api.IConnection,
) {
  // Create a new user account for context
  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Test retrieval with empty userId parameter (simulating missing/invalid userId)
  await TestValidator.error(
    "retrieval with empty userId should fail",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: "",
      });
    },
  );
}
