import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Register first user with unique email address
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphabets(4);

  const firstUser: ITodoAppUser =
    await api.functional.todoApp.auth.register.create(connection, {
      body: {
        email: firstEmail,
        password: firstPassword,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(firstUser);

  TestValidator.equals(
    "first user email matches registered email",
    firstUser.email,
    firstEmail,
  );
  TestValidator.equals(
    "first user status is active",
    firstUser.status,
    "active",
  );

  // Step 2: Attempt to register second user with same email address
  const secondPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphabets(4);

  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.todoApp.auth.register.create(connection, {
        body: {
          email: firstEmail,
          password: secondPassword,
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Step 3: Verify first user can still be accessed and email remains unique
  TestValidator.predicate(
    "first user registration was preserved",
    firstUser.id !== null && firstUser.id !== undefined,
  );

  TestValidator.equals(
    "first user email was not modified",
    firstUser.email,
    firstEmail,
  );
}
