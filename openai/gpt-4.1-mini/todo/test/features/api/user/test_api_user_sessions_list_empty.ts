import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_list_empty(
  connection: api.IConnection,
) {
  // Create a new connection for the user
  const userConnection: api.IConnection = { host: connection.host };
  // Join a new user with random credentials
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: "http://localhost/join",
      referrer: "http://localhost/",
      ip: null,
    } satisfies IMultiUserTodoUser.IJoin,
  });
  // Update userConnection headers with the authorized user's access token
  userConnection.headers = {
    Authorization: `Bearer ${user.token.access}`,
  };
  // Request the current user's sessions with no filters, expecting empty list
  const response = await api.functional.multiUserTodo.user.sessions.index(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // Validate pagination shows zero records and zero pages
  TestValidator.equals("pagination.records", response.pagination.records, 0);
  TestValidator.equals("pagination.pages", response.pagination.pages, 0);
  TestValidator.equals("pagination.current", response.pagination.current, 1);
  TestValidator.equals("pagination.limit", response.pagination.limit, 100);
  // Validate the data array is empty
  TestValidator.equals("response data length", response.data.length, 0);
}
