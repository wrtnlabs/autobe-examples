import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_password_reset_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data for user registration
  const randomUserEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphabets(12);
  // Register user first (using direct API since no user creation endpoint exists)
  // Since password reset functionality requires an existing user,
  // we'll create a password reset request directly without user registration
  // Create password reset request
  const passwordReset = await api.functional.todoApp.password_resets.at(
    connection,
    {
      resetId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(passwordReset);
  // Retrieve password reset using the same reset ID
  const retrieved = await api.functional.todoApp.password_resets.at(
    connection,
    {
      resetId: passwordReset.id,
    },
  );
  typia.assert(retrieved);
  // Validate retrieved password reset matches original
  TestValidator.equals(
    "password reset ID matches",
    retrieved.id,
    passwordReset.id,
  );
  TestValidator.equals("token matches", retrieved.token, passwordReset.token);
  TestValidator.equals(
    "expired_at matches",
    retrieved.expired_at,
    passwordReset.expired_at,
  );
}
