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

export async function test_api_user_password_reset_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/",
    ip: null,
  };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(authorizedUser);
  // 2. Generate a random token to use (no API to create real token in test)
  const token = RandomGenerator.alphaNumeric(32);
  // 3. Prepare update body
  const updateBody: IMultiUserTodoUserPasswordReset.IUpdate = {
    token: token,
    password: RandomGenerator.alphabets(12),
  };
  // 4. Call updatePasswordReset endpoint
  const resetResponse =
    await api.functional.multiUserTodo.user.password_resets.updatePasswordReset(
      userConnection,
      { body: updateBody },
    );
  typia.assert(resetResponse);
  // 5. Validate returned user ID matches authorized user ID
  TestValidator.equals(
    "userId matches authorized user",
    resetResponse.multiUserTodoUserId,
    authorizedUser.id,
  );
  // 6. Validate token matches input token
  TestValidator.equals("token matches", resetResponse.token, updateBody.token);
  // 7. Validate token expiration is in the future
  const expiredAtDate = new Date(resetResponse.expiredAt);
  TestValidator.predicate(
    "token expiration is in the future",
    expiredAtDate > new Date(),
  );
  // 8. Validate user displayName exists
  TestValidator.predicate(
    "displayName exists",
    typeof resetResponse.user.displayName === "string" &&
      resetResponse.user.displayName.length > 0,
  );
}
