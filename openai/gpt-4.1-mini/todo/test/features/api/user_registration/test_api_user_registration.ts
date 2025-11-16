import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_user_registration(connection: api.IConnection) {
  // 1. Generate registration details with valid email, password, and name
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITodoListTodoListUser.ICreate;

  // 2. Call the user join API endpoint with the registration data
  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });

  // 3. Validate the response object types and formats
  typia.assert(user);

  // 4. Check that user ID is a valid UUID string
  TestValidator.predicate(
    "User ID is a valid UUID string",
    typia.is<string & tags.Format<"uuid">>(user.id),
  );

  // 5. Verify that access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "Access token is a non-empty string",
    typeof user.token.access === "string" && user.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token is a non-empty string",
    typeof user.token.refresh === "string" && user.token.refresh.length > 0,
  );

  // 6. Validate that token expiration timestamps are ISO 8601 date-time strings
  TestValidator.predicate(
    "Token expiration 'expired_at' is ISO 8601 date-time",
    typia.is<string & tags.Format<"date-time">>(user.token.expired_at),
  );
  TestValidator.predicate(
    "Token expiration 'refreshable_until' is ISO 8601 date-time",
    typia.is<string & tags.Format<"date-time">>(user.token.refreshable_until),
  );
}
