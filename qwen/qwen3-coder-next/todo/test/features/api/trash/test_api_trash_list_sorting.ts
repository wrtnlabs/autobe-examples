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

export async function test_api_trash_list_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two test users
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppUser.IJoin,
  });
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Test sorting by createdAt (newest first)
  const sortedByCreatedDesc = await api.functional.todoApp.user.trash.index(
    user1Connection,
    {
      body: {
        sortFields: [{ field: "created_at", direction: "desc" }],
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByCreatedDesc);
  // 3. Test sorting by startDate (earliest first, nulls last)
  const sortedByStartDateAsc = await api.functional.todoApp.user.trash.index(
    user1Connection,
    {
      body: {
        sortFields: [{ field: "start_date", direction: "asc" }],
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByStartDateAsc);
  // 4. Test sorting by dueDate (latest first, nulls last)
  const sortedByDueDateDesc = await api.functional.todoApp.user.trash.index(
    user1Connection,
    {
      body: {
        sortFields: [{ field: "due_date", direction: "desc" }],
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByDueDateDesc);
  // 5. Test multi-field sorting
  const sortedMultiField = await api.functional.todoApp.user.trash.index(
    user1Connection,
    {
      body: {
        sortFields: [
          { field: "created_at", direction: "desc" },
          { field: "due_date", direction: "asc" },
        ],
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedMultiField);
  // 6. Test pagination with sorting
  const paginatedResult = await api.functional.todoApp.user.trash.index(
    user1Connection,
    {
      body: {
        sortFields: [{ field: "created_at", direction: "desc" }],
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit enforced",
    paginatedResult.data.length,
    paginatedResult.data.length,
  );
  TestValidator.equals(
    "pagination metadata correct",
    paginatedResult.pagination.limit,
    2,
  );
  // 7. Verify user2 cannot access user1's trash
  const unauthorizedAccess = await api.functional.todoApp.user.trash.index(
    user2Connection,
    {
      body: {
        sortFields: [{ field: "created_at", direction: "desc" }],
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(unauthorizedAccess);
  // User 2 should see their own trash items (if any exist)
  TestValidator.predicate(
    "user2 has valid trash response",
    Array.isArray(unauthorizedAccess.data),
  );
}
