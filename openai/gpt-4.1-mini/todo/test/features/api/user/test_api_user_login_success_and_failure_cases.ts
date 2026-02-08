import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_success_and_failure_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // 1. Successful user login with correct email and password.
  // 2. Login with valid email but incorrect password.
  // 3. Login attempt with an unregistered email.
  // All scenarios validate security checks and authorization policy for login operation.
  // Create a userJoin-specific connection
  const userJoinConnection: api.IConnection = { host: connection.host };
  // Generate valid user join data
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(),
  } satisfies IMultiUserTodoUser.IJoin;
  // 1. User registration (join) to create user account
  const authorized = await authorize_user_join(userJoinConnection, {
    body: userJoinBody,
  });
  typia.assert(authorized);
  // Create a login-specific connection
  const userLoginConnection: api.IConnection = { host: connection.host };
  // Login body with correct credentials
  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
  } satisfies IMultiUserTodoUser.ILogin;
  // 2. Successful login with correct email and password
  const loginResult = await authorize_user_login(userLoginConnection, {
    body: userLoginBody,
  });
  typia.assert(loginResult);
  TestValidator.predicate(
    "login token access length",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh length",
    loginResult.token.refresh.length > 0,
  );
  const expiredAtDate = new Date(loginResult.token.expired_at);
  const refreshableUntilDate = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "token expired_at is valid date",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "token refreshable_until is valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );
  // 3. Login with valid email but incorrect password
  const userLoginWrongPasswordConnection: api.IConnection = {
    host: connection.host,
  };
  const wrongPasswordBody = {
    email: userJoinBody.email,
    password: "IncorrectPassword!",
  } satisfies IMultiUserTodoUser.ILogin;
  await TestValidator.httpError(
    "login with wrong password should return 401 error",
    401,
    async () => {
      await authorize_user_login(userLoginWrongPasswordConnection, {
        body: wrongPasswordBody,
      });
    },
  );
  // 4. Login attempt with unregistered email
  const unregisteredEmailLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const unregisteredEmailBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SomePassword123!",
  } satisfies IMultiUserTodoUser.ILogin;
  await TestValidator.httpError(
    "login with unregistered email should return 401 error",
    401,
    async () => {
      await authorize_user_login(unregisteredEmailLoginConnection, {
        body: unregisteredEmailBody,
      });
    },
  );
}
