import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { prepare_random_todo_app_access_token } from "../../../prepare/prepare_random_todo_app_access_token";
import { generate_random_todo_app_access_tokens_create } from "../../../generate/generate_random_todo_app_access_tokens_create";
export async function test_api_todo_app_access_token_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create the token creation request body with all required and optional null properties
  const issuedAt = new Date().toISOString();
  const expiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour later
  const requestBody = {
    token: RandomGenerator.alphaNumeric(32),
    type: "bearer",
    issued_at: issuedAt,
    expired_at: expiredAt,
    revoked_at: null,
    todo_app_user_id: null,
    todo_app_guest_id: null,
    todo_app_user_session_id: null,
  } satisfies ITodoAppAccessToken.ICreate;
  // Step 2: Call the utility generation function to create the access token
  const token = await generate_random_todo_app_access_tokens_create(
    connection,
    { body: requestBody },
  );
  // Step 3: Assert the token response type
  typia.assert(token);
  // Step 4: Validate important fields with TestValidator
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date string",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date string",
    !isNaN(Date.parse(token.refreshable_until)),
  );
  TestValidator.predicate(
    "issued_at precedes expired_at",
    new Date(issuedAt).getTime() < new Date(token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "expired_at precedes refreshable_until",
    new Date(token.expired_at).getTime() <
      new Date(token.refreshable_until).getTime(),
  );
}
