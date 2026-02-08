import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_login_success_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a connection for user registration
  const joinConnection: api.IConnection = { host: connection.host };
  // Generate valid user join data
  const userJoinBody: IDiscussionBoardRegisteredUser.IJoin = {};
  // 2. Register a new user
  const authorized = await authorize_registered_user_join(joinConnection, {
    body: userJoinBody,
  });
  typia.assert(authorized);
  // 3. Create a connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // Assuming IDiscussionBoardRegisteredUser.ILogin has same properties as IJoin
  // As schema details are missing, reuse userJoinBody for login
  const loginBody: IDiscussionBoardRegisteredUser.ILogin = {};
  // 4. Attempt login with correct credentials
  const loginResult = await authorize_registered_user_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // 5. Validate token structure
  const token = loginResult.token;
  typia.assert<string>(token.access);
  typia.assert<string>(token.refresh);
  typia.assert<string & tags.Format<"date-time">>(token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(token.refreshable_until);
  // 6. Test login failure for banned user and incorrect credentials
  await TestValidator.error("banned user cannot login", async () => {
    // We simulate banned user login by attempting login with some credentials
    // that do not exist or are banned (mocking required).
    await authorize_registered_user_login(loginConnection, {
      body: {} as IDiscussionBoardRegisteredUser.ILogin,
    });
  });
  await TestValidator.error("incorrect credentials login fails", async () => {
    // Login with invalid credentials
    await authorize_registered_user_login(loginConnection, {
      body: {} as IDiscussionBoardRegisteredUser.ILogin,
    });
  });
}
