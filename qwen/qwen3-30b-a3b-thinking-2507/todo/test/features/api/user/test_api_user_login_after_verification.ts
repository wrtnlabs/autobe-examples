import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_login_after_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create new user account using utility (POST /todo/auth/user/join)
  const user = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoUser.IJoin,
  });
  // Verify the user's email (POST /todo/user/auth/users/verify/email)
  await api.functional.todo.user.auth.users.verify.email.verifyEmail(
    connection,
    {
      body: {} satisfies ITodoUserEmailVerification.IVerify,
    },
  );
  // Now log in with the verified user account (POST /todo/auth/user/login)
  const loginResult = await authorize_user_login(connection, {
    body: {
      email: user.email,
      password: "password",
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies ITodoUser.ILogin,
  });
  // Validate response structure and contents
  typia.assert(loginResult);
  TestValidator.equals(
    "loginResult id matches user id",
    loginResult.id,
    user.id,
  );
  TestValidator.equals(
    "loginResult email matches user email",
    loginResult.email,
    user.email,
  );
  TestValidator.equals(
    "loginResult token has access token",
    typeof loginResult.token.access,
    "string",
  );
  TestValidator.equals(
    "loginResult token has refresh token",
    typeof loginResult.token.refresh,
    "string",
  );
  TestValidator.equals(
    "loginResult token has expired_at",
    typeof loginResult.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "loginResult token has refreshable_until",
    typeof loginResult.token.refreshable_until,
    "string",
  );
}
