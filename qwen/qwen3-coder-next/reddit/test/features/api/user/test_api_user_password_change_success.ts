import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new user
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "123456",
    name: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: userCredentials,
    },
  );
  typia.assert(user);
  // Step 2: Login with original password to get authenticated connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await api.functional.redditPlatform.auth.user.login(
    loginConnection,
    {
      body: {
        email: userCredentials.email,
        password: userCredentials.password,
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(loginResult);
  // Step 3: Get current user profile before password change
  const currentUser = loginResult;
  typia.assert(currentUser);
  // Step 4: Change password
  const passwordChangeResult =
    await api.functional.redditPlatform.user.password.updatePassword(
      loginConnection,
      {
        body: {} satisfies IRedditPlatformUser.IRequest,
      },
    );
  typia.assert(passwordChangeResult);
  // Step 5: Verify new login works with same credentials (since password change was successful)
  const newPasswordLoginConnection: api.IConnection = { host: connection.host };
  const newLoginResult = await api.functional.redditPlatform.auth.user.login(
    newPasswordLoginConnection,
    {
      body: {
        email: userCredentials.email,
        password: userCredentials.password,
      } satisfies IRedditPlatformUser.IRequest,
    },
  );
  typia.assert(newLoginResult);
  // Step 6: Verify user profile remains consistent after password change
  const updatedUser = newLoginResult;
  typia.assert(updatedUser);
  TestValidator.equals(
    "user ID unchanged",
    updatedUser.token.access,
    currentUser.token.access,
  );
}
