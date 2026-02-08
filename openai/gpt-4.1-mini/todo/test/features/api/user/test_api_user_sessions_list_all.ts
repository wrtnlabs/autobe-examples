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

export async function test_api_user_sessions_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate user by joining
  const userConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_user_join(userConnection, {
    body: typia.random<IMultiUserTodoUser.IJoin>(),
  });
  userConnection.headers ??= {};
  userConnection.headers.Authorization = joinOutput.token.access;
  // 2. Request user's full paginated session list without any filters
  const response = await api.functional.multiUserTodo.user.sessions.index(
    userConnection,
    { body: {} },
  );
  typia.assert(response);
  // 3. Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination current page positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pages correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Cannot validate individual session properties because ISummary is empty, so skip those checks
}
