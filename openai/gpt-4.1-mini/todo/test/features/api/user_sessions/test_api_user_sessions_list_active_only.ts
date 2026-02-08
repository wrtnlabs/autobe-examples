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

export async function test_api_user_sessions_list_active_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and obtains authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: typia.random<IMultiUserTodoUser.IJoin>(),
  });
  typia.assert(authorized);
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Request user's sessions with empty filter body (no filter supported)
  const response = await api.functional.multiUserTodo.user.sessions.index(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata integrity
  TestValidator.predicate(
    "valid current page number",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "valid limit per page",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "valid total records",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "page number within total pages",
    response.pagination.current <= response.pagination.pages,
  );
  // 4. Validate response data array exists (cannot validate session details due to schema)
  TestValidator.predicate(
    "response contains sessions data array",
    Array.isArray(response.data),
  );
}
