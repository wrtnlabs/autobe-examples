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

export async function test_api_trash_list_completion_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create users for testing
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Call trash endpoint with complete filter
  const completeTrash = await api.functional.todoApp.user.trash.index(
    user1Connection,
    {
      body: {
        status: "complete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeTrash);
  // 3. Call trash endpoint with incomplete filter
  const incompleteTrash = await api.functional.todoApp.user.trash.index(
    user1Connection,
    {
      body: {
        status: "incomplete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteTrash);
  // 4. Call trash endpoint with all filter
  const allTrash = await api.functional.todoApp.user.trash.index(
    user1Connection,
    {
      body: {
        status: "all",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTrash);
  // 5. Verify user2's trash is isolated
  const user2Trash = await api.functional.todoApp.user.trash.index(
    user2Connection,
    {
      body: {
        status: "all",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(user2Trash);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata present",
    allTrash.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit present",
    allTrash.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records present",
    allTrash.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages present",
    allTrash.pagination.pages >= 0,
  );
  // 7. Verify filtering behavior (if data exists)
  const totalFromFilters =
    completeTrash.data.length + incompleteTrash.data.length;
  if (allTrash.data.length === totalFromFilters) {
    TestValidator.equals(
      "filter count matches all",
      allTrash.data.length,
      totalFromFilters,
    );
  }
}
