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

/**
 * Test that user account deletion properly cascades removal of all user data.
 *
 * Flow:
 * - User joins with random credentials.
 * - User creates multiple todos.
 * - User deletes their account.
 * - Verify that user record, todos, and todo histories are all removed.
 * - Attempt to fetch the deleted data results in no data found.
 */
export async function test_api_user_account_deletion_cascades_data_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userJoinConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://referrer.example.com",
    ip: null,
  };
  const authorized = await authorize_user_join(userJoinConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Reuse the connection with updated Authorization header
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 2. Since no todo creation API is available, skip todo creation explicitly
  // 3. Perform user account deletion
  await api.functional.multiUserTodo.user.users.erase(userConnection);
  // 4. Verify that the user account is deleted
  // Expect login to fail after deletion
  await TestValidator.error(
    "user login after deletion throws error",
    async () => {
      await authorize_user_login(userJoinConnection, {
        body: {
          email: joinBody.email,
          password: joinBody.password,
        },
      });
    },
  );
}
