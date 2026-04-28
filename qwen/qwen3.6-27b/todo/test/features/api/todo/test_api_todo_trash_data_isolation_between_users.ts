import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

/**
 * Validates trash data isolation between different member users.
 *
 * This test ensures that the soft-deleted (trashed) todo items are strictly isolated per user. When one member deletes todos, they only appear in that member's trash view, never in another member's trash endpoint results.
 *
 * 1. First member registers and creates multiple todos
 * 2. First member soft-deletes their todos using the erase endpoint
 * 3. First member verifies their own trash contains those deleted todos
 * 4. Second member registers as a separate account
 * 5. Second member queries their trash list
 * 6. Second member receives an empty trash list, confirming data isolation
 *
 * Data isolation must work at the user account level where each authenticated member only retrieves their own deleted records, never records belonging to other users.
 *
 * 1. Authenticate first member user via join endpoint
 * 2. Create todos owned by first member
 * 3. Soft-delete first member's todos to move them to trash
 * 4. First member confirms trash contains their deleted todos
 * 5. Authenticate second member user via join endpoint
 * 6. Retrieve trash list from second member's authenticated session
 * 7. Validate second member's trash list is empty
 */
export async function test_api_todo_trash_data_isolation_between_users(
  connection: api.IConnection,
) {
  // 1. First member setup
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {
    body: {
      email: "first-member@example.com",
      password: "Password123!",
      href: "https://app.example.com/register",
      referrer: "https://web.example.com",
    } satisfies DeepPartial<ITodoAppMember.IJoin>,
  });
  // 2. First member creates todos
  const todo1 = await generate_random_todo_app_member_todos_create(
    firstMemberConnection,
    {
      body: {
        title: "First member's first task",
      } satisfies DeepPartial<ITodoAppTodo.ICreate>,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    firstMemberConnection,
    {
      body: {
        title: "First member's second task",
      } satisfies DeepPartial<ITodoAppTodo.ICreate>,
    },
  );
  typia.assert(todo2);
  // 3. First member soft-deletes todos to trash
  await api.functional.todoApp.member.todos.erase(firstMemberConnection, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(firstMemberConnection, {
    todoId: todo2.id,
  });
  // 4. Verify first member sees their own trash items
  const firstMemberTrash =
    await api.functional.todoApp.member.todos.trash.index(
      firstMemberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodo.ITrashRequest,
      },
    );
  typia.assert(firstMemberTrash);
  TestValidator.equals(
    "first member trash records count",
    firstMemberTrash.pagination.records,
    2,
  );
  TestValidator.predicate(
    "first member trash contains both deleted todos",
    firstMemberTrash.data.some((item) => item.id === todo1.id) &&
      firstMemberTrash.data.some((item) => item.id === todo2.id),
  );
  // 5. Second member setup
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {
    body: {
      email: "second-member@example.com",
      password: "Password456!",
      href: "https://app.example.com/register",
      referrer: "https://web.example.com",
    } satisfies DeepPartial<ITodoAppMember.IJoin>,
  });
  // 6. Second member retrieves their trash list
  const secondMemberTrash =
    await api.functional.todoApp.member.todos.trash.index(
      secondMemberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodo.ITrashRequest,
      },
    );
  typia.assert(secondMemberTrash);
  // 7. Validate data isolation: second member should see empty trash (not first member's trash)
  TestValidator.equals(
    "second member trash records count is 0",
    secondMemberTrash.pagination.records,
    0,
  );
  TestValidator.equals(
    "second member trash data array is empty",
    secondMemberTrash.data.length,
    0,
  );
}
