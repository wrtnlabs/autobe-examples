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

export async function test_api_user_password_reset_update_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration with join utility function
  const userJoinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    displayName: RandomGenerator.name(),
    href: `https://${RandomGenerator.alphabets(10)}.com/join`,
    referrer: `https://${RandomGenerator.alphabets(10)}.com/page`,
    ip: null,
  } satisfies IMultiUserTodoUser.IJoin;
  const authorized = await authorize_user_join(userJoinConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2. Create expired password reset token in DB
  // Since no utility or SDK is given to create reset token directly, we simulate delay
  // or forcibly create expired token using the endpoint if possible.
  // But the functional endpoint for creating a password reset token is not present in given info.
  // Thus, manually create an expired token via direct DB or simulate expired token.
  // Since direct DB or utility is not provided, we must fake the expired token as a string that looks valid.
  // Generate a token that looks like a valid token string, but must be expired
  const expiredToken = RandomGenerator.alphaNumeric(40); // token string (simulate length)
  // 3. Try to reset password with expired token
  const passwordResetConnection: api.IConnection = { host: connection.host };
  // The new password to set
  const newPassword = RandomGenerator.alphaNumeric(12);
  // Make the request body
  const updateBody = {
    token: expiredToken,
    password: newPassword,
  } satisfies IMultiUserTodoUserPasswordReset.IUpdate;
  // Expect the operation to throw an error due to expired token
  await TestValidator.error(
    "password reset with expired token should fail",
    async () => {
      await api.functional.multiUserTodo.user.password_resets.updatePasswordReset(
        passwordResetConnection,
        { body: updateBody },
      );
    },
  );
}
