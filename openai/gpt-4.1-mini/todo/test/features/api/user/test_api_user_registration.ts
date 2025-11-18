import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_user_registration(connection: api.IConnection) {
  // Generate valid input data for user registration
  const registrationInput = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  // Send the join request to register the user
  const result: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationInput,
    });

  // Assert the response structure and data integrity
  typia.assert(result);

  // Additional validation for JWT token details
  TestValidator.predicate(
    "token object contains access",
    !!result.token.access,
  );
  TestValidator.predicate(
    "token object contains refresh",
    !!result.token.refresh,
  );
  TestValidator.predicate(
    "token object has expired_at timestamp",
    typeof result.token.expired_at === "string",
  );
  TestValidator.predicate(
    "token object has refreshable_until timestamp",
    typeof result.token.refreshable_until === "string",
  );
}
