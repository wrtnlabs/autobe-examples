import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_account_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration (join) and obtain authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://google.com",
      ip: null,
    } satisfies IMultiUserTodoUser.IJoin,
  });
  typia.assert(authorizedUser);
  // 2. Set userConnection authorization header with token
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 3. Permanently delete user account
  await api.functional.multiUserTodo.user.users.erase(userConnection);
  // 4. Verify that token is no longer valid (logout is effected)
  // Attempting to delete again should fail with authorization error
  await TestValidator.httpError(
    "user token invalid after deletion",
    401,
    async () => {
      await api.functional.multiUserTodo.user.users.erase(userConnection);
    },
  );
}
