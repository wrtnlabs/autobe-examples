import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

export async function test_api_todo_update_partial_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with all fields populated
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.paragraph({ sentences: 3 });
  const startDate = RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 30);
  const dueDate = RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 60);
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Send update request with only the title changed
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify that title is updated
  TestValidator.equals("title is updated", updatedTodo.title, newTitle);
  // 5. Verify that description remains unchanged
  TestValidator.equals(
    "description preserved",
    updatedTodo.description,
    originalDescription,
  );
  // 6. Verify that start date remains unchanged
  TestValidator.equals(
    "start date preserved",
    updatedTodo.start_date,
    todo.start_date,
  );
  // 7. Verify that due date remains unchanged
  TestValidator.equals(
    "due date preserved",
    updatedTodo.due_date,
    todo.due_date,
  );
  // 8. Verify edit history records the title change
  TestValidator.predicate(
    "has edit history",
    updatedTodo.editHistories_count > 0,
  );
  const titleHistory = updatedTodo.editHistories.find(
    (h) => h.new_title !== null && h.new_title !== undefined,
  );
  TestValidator.predicate(
    "title change recorded in history",
    titleHistory !== undefined,
  );
  if (titleHistory) {
    TestValidator.equals(
      "old title recorded",
      titleHistory.old_title,
      originalTitle,
    );
    TestValidator.equals(
      "new title recorded",
      titleHistory.new_title,
      newTitle,
    );
  }
}
