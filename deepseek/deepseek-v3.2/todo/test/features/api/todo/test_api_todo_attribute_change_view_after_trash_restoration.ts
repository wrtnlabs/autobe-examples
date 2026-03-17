import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryAttributeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_attribute_change_view_after_trash_restoration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit the todo to generate history
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    completed: true,
  } satisfies ITodoAppTodo.IUpdate;
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // 4. Soft-delete todo to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Restore todo from trash
  const restoredTodo = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restoredTodo);
  // 6. Fetch edit histories to verify accessibility after restoration
  const histories = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(histories);
  // Validate we have at least one history
  TestValidator.predicate(
    "should have at least one edit history after restoration",
    histories.data.length > 0,
  );
  const history = histories.data[0];
  // Core validation: History remains accessible after todo restoration
  TestValidator.equals(
    "todo ID in history matches original todo",
    history.todo.id,
    todo.id,
  );
  TestValidator.equals(
    "history belongs to the correct member",
    history.member.id,
    member.id,
  );
  TestValidator.predicate(
    "history should have a description",
    history.description.length > 0,
  );
  // Note: We cannot test the attribute change endpoint directly
  // because we don't have an API to retrieve attributeChangeId values.
  // The core scenario validation is that history remains accessible
  // after a todo is restored from trash, which we have verified.
}
