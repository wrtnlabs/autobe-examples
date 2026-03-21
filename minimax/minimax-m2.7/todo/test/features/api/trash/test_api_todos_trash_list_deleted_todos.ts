import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
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

export async function test_api_todos_trash_list_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create three todos with different properties
  // Todo 1: title only
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(todo1);
  // Todo 2: title and description
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo2);
  // Todo 3: title with start_date and due_date
  const now = new Date();
  const startDate = new Date(now.getTime() + 86400000); // tomorrow
  const dueDate = new Date(now.getTime() + 86400000 * 7); // 7 days later
  const todo3 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      },
    },
  );
  typia.assert(todo3);
  // 3. Soft delete all three todos
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  // 4. Call PATCH /todos/trash with default pagination
  const trashResponse =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
    );
  typia.assert(trashResponse);
  // 5. Verify response contains paginated results with all three deleted todos
  TestValidator.equals(
    "total records should be 3",
    trashResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "data array should have 3 items",
    trashResponse.data.length,
    3,
  );
  // 6. Verify each deleted todo includes required fields
  const deletedIds = [todo1.id, todo2.id, todo3.id];
  for (const deletedTodo of trashResponse.data) {
    // Verify it includes id, title, completed status, dates, and member info
    TestValidator.predicate(
      "deleted todo should have valid UUID id",
      deletedTodo.id !== undefined,
    );
    TestValidator.predicate(
      "deleted todo should have title",
      deletedTodo.title.length > 0,
    );
    TestValidator.predicate(
      "deleted todo should have completed status",
      typeof deletedTodo.completed === "boolean",
    );
    TestValidator.predicate(
      "deleted todo should have member info",
      deletedTodo.member !== undefined,
    );
    TestValidator.predicate(
      "deleted todo id should be one of the deleted todos",
      deletedIds.includes(deletedTodo.id),
    );
  }
  // 7. Verify pagination metadata
  TestValidator.equals(
    "current page should be 0",
    trashResponse.pagination.current,
    0,
  );
  TestValidator.predicate(
    "limit should be positive",
    trashResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pages should be at least 1",
    trashResponse.pagination.pages >= 1,
  );
  // 8. Verify todos are sorted by created_at descending (newest first)
  for (let i = 0; i < trashResponse.data.length - 1; i++) {
    const current = new Date(trashResponse.data[i].created_at);
    const next = new Date(trashResponse.data[i + 1].created_at);
    TestValidator.predicate(
      "todos should be sorted by created_at descending",
      current >= next,
    );
  }
  // 9. Verify that active (non-deleted) todos do NOT appear in trash
  // The trash should only contain the 3 deleted todos
  const trashIds = trashResponse.data.map((t) => t.id);
  TestValidator.equals(
    "first deleted todo in trash",
    trashIds.includes(todo1.id),
    true,
  );
  TestValidator.equals(
    "second deleted todo in trash",
    trashIds.includes(todo2.id),
    true,
  );
  TestValidator.equals(
    "third deleted todo in trash",
    trashIds.includes(todo3.id),
    true,
  );
}
