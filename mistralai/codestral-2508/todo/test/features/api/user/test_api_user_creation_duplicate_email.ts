import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_creation_duplicate_email(
  connection: api.IConnection,
) {
  // Create initial user with unique email
  const initialEmail: string = typia.random<string & tags.Format<"email">>();
  const initialUser: ITodoListUser = await api.functional.todoList.users.create(
    connection,
    {
      body: {
        email: initialEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(initialUser);
  TestValidator.equals(
    "initial user email matches",
    initialUser.email,
    initialEmail,
  );

  // Attempt to create user with duplicate email
  await TestValidator.error(
    "duplicate email registration should fail with appropriate error message",
    async () => {
      await api.functional.todoList.users.create(connection, {
        body: {
          email: initialEmail,
          password: RandomGenerator.alphaNumeric(12),
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
