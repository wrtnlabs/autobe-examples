import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_registration(connection: api.IConnection) {
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);

  const createdUser: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(createdUser);

  TestValidator.equals("user email matches", createdUser.email, email);
  TestValidator.predicate(
    "user is active",
    createdUser.deleted_at === undefined,
  );
  TestValidator.predicate(
    "user has password hash",
    createdUser.password_hash !== undefined,
  );
  TestValidator.predicate("user has id", createdUser.id !== undefined);
  TestValidator.predicate(
    "user has created_at",
    createdUser.created_at !== undefined,
  );
  TestValidator.predicate(
    "user has updated_at",
    createdUser.updated_at !== undefined,
  );
}
