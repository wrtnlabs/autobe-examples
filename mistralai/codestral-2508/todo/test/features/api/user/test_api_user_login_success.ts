import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user login with valid credentials.
 *
 * Validates that the system correctly authenticates users and returns a valid
 * access token. This scenario includes creating a user account first to ensure
 * the login operation has a valid user to authenticate.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // 1. Create a user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphabets(8);

  const user: ITodoListUser = await api.functional.todoList.users.create(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Login with valid credentials
  const loginResponse: ITodoListUser.IAccessToken =
    await api.functional.todoList.users.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginResponse);

  // 3. Validate the access token
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof loginResponse.token === "string" && loginResponse.token.length > 0,
  );
}
