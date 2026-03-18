import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import type { IPageIMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_permanent_delete_from_trash_deletes_edit_history_and_prevents_restore(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    ...(memberConnection.headers ?? {}),
  };
  const todo = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1>>(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo);
  const updateBody = {
    edited_at: new Date().toISOString(),
    changes: null,
  } satisfies IMultiUserTodoEditHistoryEntry.IUpdate;
  const updated = await api.functional.multiUserTodo.member.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  const preDeleteHistory =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(preDeleteHistory);
  TestValidator.predicate(
    "edit history exists before permanent deletion",
    preDeleteHistory.data.length > 0,
  );
  await api.functional.multiUserTodo.member.todos.erase(userConnection, {
    todoId: todo.id,
  });
  await api.functional.multiUserTodo.member.trash.erase(userConnection, {
    todoId: todo.id,
  });
  await TestValidator.error(
    "edit history is unavailable after permanent deletion",
    async () => {
      const after =
        await api.functional.multiUserTodo.member.todos.editHistory.index(
          userConnection,
          {
            todoId: todo.id,
            body: {
              page: 1,
              limit: 10,
            } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
          },
        );
      typia.assert(after);
    },
  );
  await TestValidator.error(
    "todo cannot be updated after permanent deletion",
    async () => {
      const retry = await api.functional.multiUserTodo.member.todos.update(
        userConnection,
        {
          todoId: todo.id,
          body: updateBody,
        },
      );
      typia.assert(retry);
    },
  );
}
