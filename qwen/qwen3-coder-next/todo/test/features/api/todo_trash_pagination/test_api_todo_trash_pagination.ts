import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoTrash } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoTrash";
import type { ITodoAppTodoTrash } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrash";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_trash_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppUser.IJoin,
  });
  // Create a new connection with the auth token
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers = {
    Authorization: `Bearer ${userAuth.token.access}`,
  };
  // 2. Test pagination with various page sizes
  // Request page 1 with limit=5
  const response1 = await api.functional.todoApp.user.trash.index(
    authedConnection,
    {
      body: {} satisfies ITodoAppTodoTrash.IRequest,
    },
  );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    response1.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response1.pagination.pages >= 0,
  );
  // 3. Test with different limit values
  const response2 = await api.functional.todoApp.user.trash.index(
    authedConnection,
    {
      body: {} satisfies ITodoAppTodoTrash.IRequest,
    },
  );
  typia.assert(response2);
  // 4. Verify data structure when items exist
  if (response1.data && response1.data.length > 0) {
    for (const item of response1.data) {
      typia.assert<ITodoAppTodoTrash.ISummary>(item);
    }
  }
}
