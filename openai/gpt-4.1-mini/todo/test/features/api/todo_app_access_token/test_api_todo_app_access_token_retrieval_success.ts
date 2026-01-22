import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
/**
 * Test that a valid access token can be retrieved successfully by its unique
 * ID. Validates completeness and correctness of the returned token details.
 *
 * This test calls the GET /todoApp/access-tokens/{accessTokenId} endpoint,
 * asserting the response structure and business logic requirements.
 *
 * It ensures the access token details include required access and refresh
 * tokens, expiration timestamps, token strings, and optional linked
 * user/session booleans.
 *
 * Steps:
 *
 * 1. Prepare a new actor-specific connection from the base connection.
 * 2. Generate a valid UUID for the accessTokenId path parameter.
 * 3. Call the endpoint to retrieve the access token.
 * 4. Fully assert the response type safety using typia.assert.
 * 5. Perform additional predicate checks on key properties to confirm business
 *    logic validity.
 */
export async function test_api_todo_app_access_token_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new actor-specific connection from the base connection
  const actorConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID to use as the accessTokenId path parameter
  const accessTokenId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Make the API call to retrieve the access token details
  const output: ITodoAppAccessToken =
    await api.functional.todoApp.access_tokens.at(actorConnection, {
      accessTokenId,
    });
  // Assert the output strictly matches ITodoAppAccessToken type definition
  typia.assert(output);
  // Additional business logic validations with clear titles
  TestValidator.predicate(
    "access token access is non-empty string",
    typeof output.access === "string" && output.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof output.refresh === "string" && output.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a non-empty string",
    typeof output.expired_at === "string" && output.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is a non-empty string",
    typeof output.refreshable_until === "string" &&
      output.refreshable_until.length > 0,
  );
  // Optional boolean properties validation if present
  TestValidator.predicate(
    "token is boolean",
    typeof output.token === "boolean",
  );
  TestValidator.predicate("type is boolean", typeof output.type === "boolean");
  TestValidator.predicate(
    "issued_at is boolean",
    typeof output.issued_at === "boolean",
  );
  if (output.revoked_at !== null && output.revoked_at !== undefined) {
    TestValidator.predicate(
      "revoked_at is boolean",
      typeof output.revoked_at === "boolean",
    );
  }
  if (
    output.todo_app_user_id !== null &&
    output.todo_app_user_id !== undefined
  ) {
    TestValidator.predicate(
      "todo_app_user_id is boolean",
      typeof output.todo_app_user_id === "boolean",
    );
  }
  if (
    output.todo_app_guest_id !== null &&
    output.todo_app_guest_id !== undefined
  ) {
    TestValidator.predicate(
      "todo_app_guest_id is boolean",
      typeof output.todo_app_guest_id === "boolean",
    );
  }
  if (
    output.todo_app_user_session_id !== null &&
    output.todo_app_user_session_id !== undefined
  ) {
    TestValidator.predicate(
      "todo_app_user_session_id is boolean",
      typeof output.todo_app_user_session_id === "boolean",
    );
  }
}
