import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_successful(
  connection: api.IConnection,
) {
  // 1. Create a user account with known credentials for login testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // 2. Test successful login with the registered credentials
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);

  // 3. Verify the login response structure and token validity
  TestValidator.equals(
    "logged in user ID matches created user ID",
    loginResponse.id,
    createdUser.id,
  );

  TestValidator.equals(
    "logged in user email matches registered email",
    loginResponse.email,
    userEmail,
  );

  TestValidator.predicate(
    "access token exists and is non-empty",
    loginResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists and is non-empty",
    loginResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(loginResponse.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    new Date(loginResponse.token.refreshable_until) >
      new Date(loginResponse.token.expired_at),
  );
}
