import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodoEditHistory";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import type { IPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_todo_edit_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new todo without any edits
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history for the newly created todo
  const editHistory =
    await api.functional.privateTodoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IPrivateTodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistory);
  // 4. Validate empty edit history
  TestValidator.equals("data array is empty", editHistory.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    editHistory.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    editHistory.pagination.pages,
    0,
  );
}
