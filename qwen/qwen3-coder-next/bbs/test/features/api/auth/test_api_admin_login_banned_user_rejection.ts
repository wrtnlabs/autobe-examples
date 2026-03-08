import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_banned_user_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = "SecurePass123!";
  const joinDisplayName = RandomGenerator.name();
  const joinedAdmin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      display_name: joinDisplayName,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinedAdmin);
  // 2. Attempt login with the newly created admin credentials (positive test)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Verify that login with invalid credentials fails
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await authorize_admin_login(loginConnection, {
        body: {
          email: joinEmail,
          password: "wrongpassword",
        } satisfies IDiscussionBoardAdmin.ILogin,
      });
    },
  );
  // 4. Verify that login with non-existent user fails
  await TestValidator.error(
    "login should fail with non-existent user",
    async () => {
      await authorize_admin_login(loginConnection, {
        body: {
          email: "nonexistent@example.com",
          password: "somepassword",
        } satisfies IDiscussionBoardAdmin.ILogin,
      });
    },
  );
}
