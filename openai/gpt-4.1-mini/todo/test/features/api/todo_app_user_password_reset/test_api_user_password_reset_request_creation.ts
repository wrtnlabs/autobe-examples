import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { prepare_random_todo_app_user_password_reset } from "../../../prepare/prepare_random_todo_app_user_password_reset";
import { generate_random_todo_app_user_password_resets_create } from "../../../generate/generate_random_todo_app_user_password_resets_create";
export async function test_api_user_password_reset_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Prepare a valid user ID (UUID) for password reset request
  const todo_app_user_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 2: Call the generation function to create the password reset request
  const resetRequest: ITodoAppUserPasswordReset =
    await generate_random_todo_app_user_password_resets_create(connection, {
      body: { todo_app_user_id },
    });
  // Step 3: Validate the response
  typia.assert(resetRequest);
  // Step 4: Validate the returned user ID matches the request
  TestValidator.equals(
    "Response todo_app_user_id matches request",
    resetRequest.todo_app_user_id,
    todo_app_user_id,
  );
  // Step 5: Validate the token exists and is a non-empty string
  TestValidator.predicate(
    "Response token exists and is string",
    typeof resetRequest.token === "string" && resetRequest.token.length > 0,
  );
  // Step 6: Confirm expires_at and requested_at are either null or properly formatted strings
  if (
    resetRequest.expires_at !== null &&
    resetRequest.expires_at !== undefined
  ) {
    TestValidator.predicate(
      "expires_at is a string if present",
      typeof resetRequest.expires_at === "string",
    );
  }
  if (
    resetRequest.requested_at !== null &&
    resetRequest.requested_at !== undefined
  ) {
    TestValidator.predicate(
      "requested_at is a string if present",
      typeof resetRequest.requested_at === "string",
    );
  }
}
