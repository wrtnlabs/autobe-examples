import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_account_deletion_by_owner(
  connection: api.IConnection,
) {
  // Create a new user account
  const password = RandomGenerator.alphaNumeric(16);
  const user = await authorize_user_join(connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password: password,
    },
  });
  typia.assert(user);
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Login with the newly created user
  await authorize_user_login(userConnection, {
    body: {
      email: user.email,
      password: password,
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  // Delete the user account using the user's own ID
  await api.functional.todo.user.users.erase(userConnection, {
    userId: user.id,
  });
  // No data validation expected - successful deletion returns 204 No Content
  typia.assert(undefined);
}
