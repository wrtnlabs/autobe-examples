import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid user account using authorize_user_join utility
  const userConnection: api.IConnection = { host: connection.host };
  const userData = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userData);
  // Step 2: Create a new connection for the login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Attempt login with correct email but wrong password
  // Using TestValidator.httpError to specifically validate 401 Unauthorized
  await TestValidator.httpError(
    "login with wrong password should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.auth.user.login(loginConnection, {
        body: {
          email: userData.email,
          password: RandomGenerator.alphaNumeric(16), // different random password
        } satisfies ICommunityPlatformUser.ILogin,
      });
    },
  );
  // Step 4: Verify no authorization token was set in the connection headers
  TestValidator.predicate("no token set after failed login", () => {
    return loginConnection.headers?.Authorization === undefined;
  });
}
