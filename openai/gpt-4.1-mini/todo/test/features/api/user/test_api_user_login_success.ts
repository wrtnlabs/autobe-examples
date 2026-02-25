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

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests successful user login. It covers the process of a registered user providing valid email and password credentials, expecting successful authentication. The response should include JWT access and refresh tokens with proper expiration metadata along with user profile details such as unique ID and display name. The system should validate credentials securely against hashed passwords and issue tokens accordingly.
  // 1. Register a new user to have valid login credentials
  const joinConnection: api.IConnection = { host: connection.host };
  // Generate a randomized user join request body
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
    ip: null,
  } satisfies IMultiUserTodoUser.IJoin;
  const joinedUser = await authorize_user_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joinedUser);
  // 2. Attempt to login using the same email and password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IMultiUserTodoUser.ILogin;
  const authorizedUser = await authorize_user_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(authorizedUser);
  // 3. Validate the authorized user response
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid ISO string",
    !isNaN(Date.parse(authorizedUser.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid ISO string",
    !isNaN(Date.parse(authorizedUser.token.refreshable_until)),
  );
  TestValidator.predicate(
    "authorized user id is non-empty string",
    typeof authorizedUser.id === "string" && authorizedUser.id.length > 0,
  );
  TestValidator.predicate(
    "authorized user displayName matches join displayName",
    authorizedUser.displayName === joinBody.displayName,
  );
}
