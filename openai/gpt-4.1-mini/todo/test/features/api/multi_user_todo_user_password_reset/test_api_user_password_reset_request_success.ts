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
import { generate_random_multi_user_todo_user_password_resets_create_password_reset } from "../../../generate/generate_random_multi_user_todo_user_password_resets_create_password_reset";
import { prepare_random_multi_user_todo_user_password_reset } from "../../../prepare/prepare_random_multi_user_todo_user_password_reset";

export async function test_api_user_password_reset_request_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the password reset request with a valid registered email.
  // 1. Create user connection and join a new user to have a registered email
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: `https://${RandomGenerator.alphabets(8)}.com/join`,
    referrer: `https://${RandomGenerator.alphabets(8)}.com/referrer`,
    ip: null,
  };
  const joinedUser = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  typia.assert(joinedUser);
  // 2. Call password reset create request with registered email
  await generate_random_multi_user_todo_user_password_resets_create_password_reset(
    userConnection,
    {
      body: { email: joinBody.email },
    },
  );
  // 3. Assert success by testing that no error was thrown, and predicate true
  TestValidator.predicate(
    "password reset request accepted without error",
    true,
  );
}
