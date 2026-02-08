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

export async function test_api_user_password_reset_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {};
  const userAuthorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  typia.assert(userAuthorized);
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 2. Generate a valid resetId (UUID string)
  const validResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the password reset token with valid resetId
  const response = await api.functional.multiUserTodo.user.password_resets.at(
    userConnection,
    { resetId: validResetId },
  );
  typia.assert(response);
  // 4. Validate that unauthorized access is prohibited by trying another user
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUserJoinBody: IMultiUserTodoUser.IJoin = {};
  const anotherUserAuthorized = await authorize_user_join(
    anotherUserConnection,
    { body: anotherUserJoinBody },
  );
  typia.assert(anotherUserAuthorized);
  anotherUserConnection.headers = {
    Authorization: anotherUserAuthorized.token.access,
  };
  // The other user should NOT be able to access the password reset token
  await TestValidator.httpError(
    "unauthorized access to password reset token",
    404,
    async () => {
      await api.functional.multiUserTodo.user.password_resets.at(
        anotherUserConnection,
        { resetId: validResetId },
      );
    },
  );
  // 5. Test 404 response when resetId does not exist
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "password reset token not found returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.user.password_resets.at(
        userConnection,
        { resetId: nonExistentResetId },
      );
    },
  );
}
