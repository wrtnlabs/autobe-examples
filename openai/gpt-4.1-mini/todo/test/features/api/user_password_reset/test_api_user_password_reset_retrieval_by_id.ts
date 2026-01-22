import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
/**
 * End-to-end test for retrieving a user password reset record by its unique
 * identifier.
 *
 * This test ensures that the API endpoint allows public access without
 * authentication and returns the correct user password reset data, including
 * token, expiration, request time, and metadata timestamps.
 *
 * The test generates a valid UUID as the userPasswordResetId, calls the API,
 * and asserts the response matches the expected ITodoAppUserPasswordReset
 * schema.
 *
 * It validates explicit presence of nullable optional fields and overall data
 * integrity.
 */
export async function test_api_user_password_reset_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for public (no authentication required)
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID to use as userPasswordResetId path parameter
  const userPasswordResetId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve the user password reset record by ID
  const result = await api.functional.todoApp.user_password_resets.at(
    publicConnection,
    {
      userPasswordResetId,
    },
  );
  // Assert that the response is fully valid and conforms to the schema
  typia.assert(result);
}
