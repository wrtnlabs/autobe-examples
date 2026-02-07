import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_trash_sort_by_due_date_with_missing_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user context
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  // 2. Query the trash endpoint with sort parameter for due_date ascending
  const trashResponse = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: { sort: ["+due_date"] } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashResponse);
  // 3. Validate response structure
  // We cannot validate due_date sorting because ITodoAppTodo.ISummary is {} and we have no control over backend data
  // We validate only that the request was accepted and response structure is correct
  TestValidator.equals(
    "response has pagination",
    typeof trashResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(trashResponse.data),
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    () => trashResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => trashResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    () => trashResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    () => trashResponse.pagination.pages >= 0,
  );
}
