import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_login_success(connection: api.IConnection) {
  // Create a user for testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "password123";

  // Register the user
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Log in with the registered user
  const loggedInUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loggedInUser);

  // Validate the response
  TestValidator.equals("user ID matches", loggedInUser.id, registeredUser.id);
  TestValidator.equals("user email matches", loggedInUser.email, userEmail);
  TestValidator.predicate(
    "token is valid",
    loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token is valid",
    loggedInUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration date",
    loggedInUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable until date",
    loggedInUser.token.refreshable_until.length > 0,
  );
}
