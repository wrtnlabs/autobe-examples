import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_registration_password_too_short(
  connection: api.IConnection,
) {
  // Test 1: Registration with 3-character password
  await TestValidator.error(
    "registration should reject password with 3 characters",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test 2: Registration with 5-character password
  await TestValidator.error(
    "registration should reject password with 5 characters",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "12345",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test 3: Registration with 7-character password (still below minimum)
  await TestValidator.error(
    "registration should reject password with 7 characters",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "passwor",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test 4: Valid registration with 8-character password (minimum requirement met)
  const validUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(validUser);
  TestValidator.predicate(
    "successful registration returns valid user with token",
    validUser.id !== undefined && validUser.token !== undefined,
  );
}
