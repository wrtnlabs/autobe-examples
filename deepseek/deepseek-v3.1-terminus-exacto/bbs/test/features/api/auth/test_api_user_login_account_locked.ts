import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test account lockout after multiple failed login attempts.
 * 1. Create test user account
 * 2. Attempt 5 consecutive failed logins with incorrect passwords
 * 3. Verify account lockout triggers after 5th attempt
 * 4. Validate that correct password also fails when account is locked
 */
export async function test_api_user_login_account_locked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test user account
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials: IDiscussionBoardUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  };
  const joinResult = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(joinResult);
  // 2. Generate incorrect password for failed attempts
  const incorrectPassword = RandomGenerator.alphaNumeric(16);
  // 3. Attempt 1-4 failed logins (should fail but not lock account)
  for (let i = 1; i <= 4; i++) {
    await TestValidator.error(
      `failed login attempt ${i} should return authentication error`,
      async () => {
        await authorize_user_login(userConnection, {
          body: {
            email: userCredentials.email,
            password: incorrectPassword,
          } satisfies IDiscussionBoardUser.ILogin,
        });
      },
    );
  }
  // 4. Attempt 5th failed login (should trigger account lockout)
  await TestValidator.error(
    "5th failed login should trigger account lockout",
    async () => {
      await authorize_user_login(userConnection, {
        body: {
          email: userCredentials.email,
          password: incorrectPassword,
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );
  // 5. Verify that correct password also fails when account is locked
  await TestValidator.error(
    "correct password should fail when account is locked",
    async () => {
      await authorize_user_login(userConnection, {
        body: {
          email: userCredentials.email,
          password: userCredentials.password,
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );
}
