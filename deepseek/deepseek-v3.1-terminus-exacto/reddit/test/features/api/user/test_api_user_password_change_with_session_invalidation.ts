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

export async function test_api_user_password_change_with_session_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account with initial password
  const initialPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: initialPassword,
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Login with initial credentials to establish session
  const initialLoginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_user_login(initialLoginConnection, {
    body: {
      email: user.email,
      password: initialPassword,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(loginResponse);
  // Store the original token for later verification
  const originalToken = initialLoginConnection.headers?.Authorization;
  // Step 3: Change password with new complex password
  const newPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.communityPlatform.user.password.updatePassword(
    initialLoginConnection,
    {
      body: {
        current_password: initialPassword,
        new_password: newPassword,
      } satisfies ICommunityPlatformUser.IUpdatePassword,
    },
  );
  // Step 4: Verify session invalidation - old token should no longer work
  await TestValidator.httpError(
    "old session should be invalidated",
    401,
    async () => {
      // Create a new connection with the old token
      const oldTokenConnection: api.IConnection = {
        host: connection.host,
        headers: { Authorization: originalToken ?? "" },
      };
      // Try to access any authenticated endpoint with old token
      await api.functional.communityPlatform.user.password.updatePassword(
        oldTokenConnection,
        {
          body: {
            current_password: newPassword,
            new_password: RandomGenerator.alphaNumeric(16),
          } satisfies ICommunityPlatformUser.IUpdatePassword,
        },
      );
    },
  );
  // Step 5: Login with new password
  const newLoginConnection: api.IConnection = { host: connection.host };
  const newLoginResponse = await authorize_user_login(newLoginConnection, {
    body: {
      email: user.email,
      password: newPassword,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(newLoginResponse);
  // Step 6: Verify new session works for authenticated operations
  await api.functional.communityPlatform.user.password.updatePassword(
    newLoginConnection,
    {
      body: {
        current_password: newPassword,
        new_password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformUser.IUpdatePassword,
    },
  );
  TestValidator.predicate(
    "password change workflow completed successfully",
    true,
  );
}