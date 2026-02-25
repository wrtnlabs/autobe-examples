import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_update_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt password reset update with an invalid/non-existent token
  // 1. User joins and gets authorized
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://referrer.example.com",
    ip: null,
  };
  const userAuthorized: IMultiUserTodoUser.IAuthorized =
    await authorize_user_join(userJoinConnection, { body: userJoinBody });
  typia.assert(userAuthorized);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 2. Attempt password reset update using a random invalid token string
  const invalidToken = typia.random<string>();
  const newPassword = RandomGenerator.alphabets(12);
  const passwordResetBody: IMultiUserTodoUserPasswordReset.IUpdate = {
    token: invalidToken,
    password: newPassword,
  };
  // 3. Expect error response (like HttpError due to invalid token)
  await TestValidator.error(
    "password reset update with invalid token should fail",
    async () => {
      await api.functional.multiUserTodo.user.password_resets.updatePasswordReset(
        userConnection,
        { body: passwordResetBody },
      );
    },
  );
  // 4. Verify no password has been changed by attempting login with old password
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(loginConnection, {
    body: {
      email: userJoinBody.email,
      password: userJoinBody.password,
    },
  });
  // 5. The invalid token is not associated with any password reset record; no logs to verify explicitly
  //    So no additional steps here.
}
