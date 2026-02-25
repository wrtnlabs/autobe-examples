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

export async function test_api_user_password_reset_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join two users
  const user1JoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: `https://example.com/${RandomGenerator.alphabets(5)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphabets(5)}`,
  };
  const user2JoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(15),
    displayName: RandomGenerator.name(),
    href: `https://example.com/${RandomGenerator.alphabets(5)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphabets(5)}`,
  };
  const user1Authorized = await authorize_user_join(
    { host: connection.host },
    { body: user1JoinBody },
  );
  const user2Authorized = await authorize_user_join(
    { host: connection.host },
    { body: user2JoinBody },
  );
  // Prepare user1 connection and user2 connection
  const user1Connection: api.IConnection = { host: connection.host };
  user1Connection.headers = { Authorization: user1Authorized.token.access };
  const user2Connection: api.IConnection = { host: connection.host };
  user2Connection.headers = { Authorization: user2Authorized.token.access };
  // 2. We must create a password reset record for user1 (simulate or actual creation not provided, so workaround)
  // Since there's no utility or API to create password reset, and we can't call SDK for the action,
  // as scenario demands, we will simulate a password reset id by sampling a random UUID for user1.
  // Note: This is a limitation; the test will use random UUID which likely does not exist, expecting 401 or 404.
  // Instead, to test unauthorized access correctly, we will try access without auth and with other user
  // 3. Attempt retrieval without authentication
  const randomResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthenticated access to password reset should be denied with 401",
    401,
    async () => {
      await api.functional.multiUserTodo.user.password_resets.at(
        { host: connection.host },
        { id: randomResetId },
      );
    },
  );
  // 4. Attempt retrieval with other user (not owner)
  await TestValidator.httpError(
    "other user access to password reset should be denied with 401",
    401,
    async () => {
      await api.functional.multiUserTodo.user.password_resets.at(
        user2Connection,
        {
          id: randomResetId,
        },
      );
    },
  );
  // Note: Since we cannot create password reset entries in test, this is best coverage for unauthorized scenario.
}
