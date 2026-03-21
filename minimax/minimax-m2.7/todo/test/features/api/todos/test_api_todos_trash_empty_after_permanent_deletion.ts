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

export async function test_api_todos_trash_empty_after_permanent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Test that a member with no deleted todos gets an empty trash list.
  // 1. Authenticate as a member
  // 2. Create a todo
  // 3. Soft delete the todo (move to trash)
  // 4. Permanently delete the todo from trash
  // 5. Call PATCH /todos/trash to list trash
  // 6. Verify the response returns an empty data array and pagination shows total count of 0
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // Step 3: Soft delete the todo (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // Step 4: Permanently delete the todo from trash
  await api.functional.multiUserTodo.member.todos.trash.erase(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  // Step 5: Call PATCH /todos/trash to list trash
  const trashList =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
    );
  typia.assert(trashList);
  // Step 6: Verify the response returns an empty data array and pagination shows total count of 0
  TestValidator.equals("trash data should be empty", trashList.data.length, 0);
  TestValidator.equals(
    "trash pagination records should be 0",
    trashList.pagination.records,
    0,
  );
  TestValidator.equals(
    "trash pagination pages should be 0",
    trashList.pagination.pages,
    0,
  );
}
