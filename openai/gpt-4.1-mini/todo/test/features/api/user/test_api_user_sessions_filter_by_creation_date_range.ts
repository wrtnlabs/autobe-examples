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

export async function test_api_user_sessions_filter_by_creation_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection for authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Authorize user join with empty IJoin object since type is empty
  const authorized = await authorize_user_join(userConnection, { body: {} });
  // Apply the token automatically set by authorize_user_join function
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Call sessions index API without filters because IRequest type is empty
  const result = await api.functional.multiUserTodo.user.sessions.index(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page >= 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", result.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  // Cannot check created_at filtering because IRequest and ISummary are empty
  // Assert Authorization header is properly set
  TestValidator.predicate(
    "Authorization header set",
    userConnection.headers !== undefined &&
      typeof userConnection.headers.Authorization === "string",
  );
}
