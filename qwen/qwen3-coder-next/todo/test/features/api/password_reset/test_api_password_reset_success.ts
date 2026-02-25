import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test data
  const token = RandomGenerator.alphaNumeric(32);
  const newPassword = (RandomGenerator.alphabets(12) +
    RandomGenerator.alphaNumeric(4) +
    "!") satisfies string & tags.MinLength<8>;
  // 2. Perform password reset
  const response = await api.functional.todoApp.password_resets.resetPassword(
    connection,
    {
      body: {
        token: token,
        password: newPassword,
      } satisfies ITodoAppUserPasswordReset.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(response);
  TestValidator.equals(
    "success message",
    response.message,
    "Password reset successful",
  );
}
