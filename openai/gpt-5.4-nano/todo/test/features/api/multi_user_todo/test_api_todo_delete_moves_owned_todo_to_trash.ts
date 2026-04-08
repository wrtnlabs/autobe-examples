import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistoryEntry";
import type { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_delete_moves_owned_todo_to_trash(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      display_name: "member-todo-trash",
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(auth);

  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);

  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });

  const afterSummary =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberConnection,
    );
  typia.assert(afterSummary);

  const historyPage =
    await api.functional.multiUserTodo.member.todos.edit_history_entries.editHistoryEntries(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          todoIds: [todo.id],
          page: null,
          limit: null,
        } satisfies IMultiUserTodoTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(historyPage);

  TestValidator.predicate(
    "edit history entries reference the deleted todo",
    () =>
      typia
        .assert<Array<{ todoId: typeof todo.id }>>(historyPage.data)
        .every((e) =>
          TestValidator.equals("todoId matches", e.todoId, todo.id),
        ),
  );
}
