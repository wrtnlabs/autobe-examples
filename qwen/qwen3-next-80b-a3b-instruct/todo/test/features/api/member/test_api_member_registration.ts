import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_member_registration(
  connection: api.IConnection,
) {
  // Generate valid test data
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(16);

  // Test 1: Successful registration with valid email and password
  const result: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: validEmail,
        password: validPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );

  // Validate response structure with typia.assert() (complete type validation)
  typia.assert(result);

  // Test 2: Registration fails with duplicate email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: validEmail, // Same email as above - duplicate
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListUser.ICreate,
    });
  });

  // Test 3: Registration fails with short password (violates complexity requirement)
  await TestValidator.error("password too short should fail", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "short", // Password shorter than required complexity (12 chars)
      } satisfies ITodoListUser.ICreate,
    });
  });

  // Test 4: Registration fails with empty password
  await TestValidator.error("empty password should fail", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "", // Empty password
      } satisfies ITodoListUser.ICreate,
    });
  });
}
