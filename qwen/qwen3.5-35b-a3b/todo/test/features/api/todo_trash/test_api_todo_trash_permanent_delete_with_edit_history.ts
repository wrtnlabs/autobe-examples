import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_trash_permanent_delete_with_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo
  const todo = await generate_random_multi_user_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit todo 3 times to create multiple edit history entries
  // Edit 1: Update title
  await api.functional.multiUserTodoApp.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      title: RandomGenerator.name(2),
    } satisfies IMultiUserTodoAppTodo.IUpdate,
  });
  // Edit 2: Update description
  await api.functional.multiUserTodoApp.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IMultiUserTodoAppTodo.IUpdate,
  });
  // Edit 3: Update both dates
  await api.functional.multiUserTodoApp.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      start_date: new Date(Date.now() + 3600000).toISOString(),
      due_date: new Date(Date.now() + 172800000).toISOString(),
    } satisfies IMultiUserTodoAppTodo.IUpdate,
  });
  // 4. Verify edit history exists before deletion (should have 4 entries: 1 creation + 3 edits)
  const historyBefore =
    await api.functional.multiUserTodoApp.member.todos.history.at(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(historyBefore);
  TestValidator.equals(
    "history entries exist before delete",
    historyBefore.data.length,
    4,
  );
  // 5. Soft delete todo (move to trash)
  await api.functional.multiUserTodoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 6. Permanently delete todo from trash
  await api.functional.multiUserTodoApp.member.todos.trash.erase(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  // 7. Verify todo no longer exists
  // Try to get history - should return empty or 404
  const historyAfter =
    await api.functional.multiUserTodoApp.member.todos.history.at(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(historyAfter);
  TestValidator.equals(
    "history entries deleted after permanent delete",
    historyAfter.data.length,
    0,
  );
  // 8. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination records is 0",
    historyAfter.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    historyAfter.pagination.pages,
    0,
  );
}
