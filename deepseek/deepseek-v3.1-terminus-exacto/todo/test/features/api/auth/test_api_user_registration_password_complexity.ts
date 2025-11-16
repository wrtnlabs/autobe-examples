import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test password validation rules by attempting registration with passwords that
 * do not meet complexity requirements. Validate that the system enforces
 * minimum password security standards and provides clear feedback on password
 * requirements.
 */
export async function test_api_user_registration_password_complexity(
  connection: api.IConnection,
) {
  // Test case 1: Password too short (common minimum length assumption)
  await TestValidator.error("very short password should fail", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "a",
        password_hash: "",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: undefined,
      } satisfies ITodoAppUser.ICreate,
    });
  });

  // Test case 2: Empty password
  await TestValidator.error("empty password should fail", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "",
        password_hash: "",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: undefined,
      } satisfies ITodoAppUser.ICreate,
    });
  });

  // Test case 3: Valid password registration
  const validUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123",
      password_hash: "",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(validUser);
  TestValidator.predicate(
    "valid password registration should succeed",
    validUser.id.length > 0,
  );
}
