import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todouser_password_reset_request_existing_user(
  connection: api.IConnection,
) {
  // 1. Prepare a new user registration payload
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  // 2. Create the todoUser (self-signup)
  const created: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // Business sanity check: newly created user must have an id
  TestValidator.predicate(
    "created user has id",
    created.id !== undefined && created.id.length > 0,
  );

  // 3. Request password reset for the created user's email
  const requestBody = {
    email: userEmail,
  } satisfies ITodoAppTodoUser.IPasswordResetRequest;
  const summary: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.password.request.requestPasswordReset(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(summary);

  // 4. Validate that the reset request targeted the same user
  TestValidator.equals(
    "password reset targeted same user id",
    summary.id,
    created.id,
  );

  // 5. Validate returned summary shape presence (typia.assert already validated types)
  TestValidator.predicate(
    "summary has createdAt",
    summary.createdAt !== undefined && summary.createdAt.length > 0,
  );
  TestValidator.predicate(
    "summary has updatedAt",
    summary.updatedAt !== undefined && summary.updatedAt.length > 0,
  );

  // Note: The API contract explicitly forbids returning the reset token in the response.
  // The ITodoAppTodoUser.ISummary DTO does not include any password_reset_token field,
  // so typia.assert already ensures the response contains no sensitive token.
}
