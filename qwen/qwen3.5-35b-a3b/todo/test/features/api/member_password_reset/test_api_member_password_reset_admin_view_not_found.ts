import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the password reset token retrieval endpoint when the token ID does not exist in the system.
 *
 * Validates the error handling behavior when attempting to retrieve a non-existent password reset token. This is critical for security auditing and support operations, ensuring that administrators receive appropriate error responses rather than leaking information about token existence.
 *
 * Special attention is given to verifying that the endpoint returns HTTP 404 Not Found for invalid token IDs, preventing information disclosure about whether tokens exist in the system.
 *
 * 1. Create connection for the API request
 * 2. Generate a valid UUID that does not exist in the database
 * 3. Attempt to retrieve the non-existent password reset token
 * 4. Verify the endpoint returns 404 Not Found status code
 */
export async function test_api_member_password_reset_admin_view_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Use base connection for the request
  const requestConnection: api.IConnection = { host: connection.host };
  // 2. Generate a valid UUID that does not exist in the database
  const nonExistentResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to retrieve the non-existent password reset token and verify 404 response
  await TestValidator.httpError(
    "non-existent token returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.member_password_resets.at(
        requestConnection,
        {
          resetId: nonExistentResetId,
        },
      );
    },
  );
}
