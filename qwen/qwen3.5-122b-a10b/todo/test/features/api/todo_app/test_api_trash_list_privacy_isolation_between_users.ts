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
 * Test trash list privacy isolation between different users.
 *
 * Validates that members can only view their own deleted todos and cannot access another user's trash. This test ensures proper data isolation and access control enforcement in the todo application's trash functionality.
 *
 * The test creates two separate member accounts, populates one user's trash with deleted todos, and verifies the other user cannot see those deleted items. It also confirms that each user can only access their own trash contents.
 *
 * 1. Register and authenticate member A.
 * 2. Create a todo item as member A.
 * 3. Soft delete the todo to move it to member A's trash.
 * 4. Register and authenticate member B (separate account).
 * 5. Call the trash list endpoint as member B.
 * 6. Verify member B's trash is empty (0 records).
 * 7. Create and delete a todo as member B.
 * 8. Verify member B can now see only their own deleted todo.
 */
export async function test_api_trash_list_privacy_isolation_between_users(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create a todo item as member A
  const todoA = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // 3. Soft delete the todo to move it to member A's trash
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todoA.id,
  });
  // 4. Register and authenticate member B (separate account)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Call the trash list endpoint as member B
  const memberBTrash = await api.functional.todoApp.member.todos.trash.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTrash);
  // 6. Verify member B's trash is empty (0 records)
  TestValidator.equals(
    "member B trash should be empty",
    memberBTrash.pagination.records,
    0,
  );
  TestValidator.equals(
    "member B trash data should be empty array",
    memberBTrash.data.length,
    0,
  );
  // 7. Create and delete a todo as member B
  const todoB = await api.functional.todoApp.member.todos.create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB);
  await api.functional.todoApp.member.todos.erase(memberBConnection, {
    todoId: todoB.id,
  });
  // 8. Verify member B can now see only their own deleted todo
  const memberBTrashAfter =
    await api.functional.todoApp.member.todos.trash.index(memberBConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(memberBTrashAfter);
  TestValidator.equals(
    "member B trash should have 1 record",
    memberBTrashAfter.pagination.records,
    1,
  );
  TestValidator.equals(
    "member B trash data should have 1 item",
    memberBTrashAfter.data.length,
    1,
  );
  TestValidator.equals(
    "deleted todo matches",
    memberBTrashAfter.data[0].id,
    todoB.id,
  );
}
