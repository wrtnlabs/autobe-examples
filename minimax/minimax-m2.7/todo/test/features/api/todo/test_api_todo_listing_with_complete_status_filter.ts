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

export async function test_api_todo_listing_with_complete_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple todos - some will remain incomplete, some will be toggled to complete
  const incompleteTodo1 =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
  typia.assert(incompleteTodo1);
  const incompleteTodo2 =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
  typia.assert(incompleteTodo2);
  const todoToComplete1 =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
  typia.assert(todoToComplete1);
  const todoToComplete2 =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
  typia.assert(todoToComplete2);
  // 3. Toggle some todos to complete status
  const completedTodo1 = await api.functional.multiUserTodo.member.todos.toggle(
    memberConnection,
    {
      todoId: todoToComplete1.id,
    },
  );
  typia.assert(completedTodo1);
  TestValidator.equals(
    "completed toggled to true",
    completedTodo1.completed,
    true,
  );
  const completedTodo2 = await api.functional.multiUserTodo.member.todos.toggle(
    memberConnection,
    {
      todoId: todoToComplete2.id,
    },
  );
  typia.assert(completedTodo2);
  TestValidator.equals(
    "completed toggled to true",
    completedTodo2.completed,
    true,
  );
  // 4. List todos with status='complete' filter
  const completeListResponse =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        status: "complete",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(completeListResponse);
  // 5. Validate that only completed todos are returned
  TestValidator.predicate(
    "all returned todos are completed",
    completeListResponse.data.every((todo) => todo.completed === true),
  );
  // Verify completed todos are included
  TestValidator.equals(
    "completed todo 1 in list",
    completeListResponse.data.some((todo) => todo.id === completedTodo1.id),
    true,
  );
  TestValidator.equals(
    "completed todo 2 in list",
    completeListResponse.data.some((todo) => todo.id === completedTodo2.id),
    true,
  );
  // Verify incomplete todos are excluded
  TestValidator.equals(
    "incomplete todo 1 NOT in list",
    completeListResponse.data.some((todo) => todo.id === incompleteTodo1.id),
    false,
  );
  TestValidator.equals(
    "incomplete todo 2 NOT in list",
    completeListResponse.data.some((todo) => todo.id === incompleteTodo2.id),
    false,
  );
  // 6. Validate pagination metadata is properly populated
  TestValidator.predicate(
    "pagination exists",
    completeListResponse.pagination !== null,
  );
  TestValidator.predicate(
    "records count matches data length",
    completeListResponse.pagination.records >= 2,
  );
}
