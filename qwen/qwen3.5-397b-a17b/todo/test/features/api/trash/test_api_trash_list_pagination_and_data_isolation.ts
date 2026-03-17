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
 * Test trash list pagination and data isolation between members.
 *
 * This test verifies that:
 * 1. Members can retrieve their soft-deleted todos from trash
 * 2. Pagination metadata is correct
 * 3. Data isolation is enforced - members cannot see other users' deleted todos
 */
export async function test_api_trash_list_pagination_and_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A authenticates and creates todos
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // Step 2: Member A creates multiple todos
  const todoCount = 5;
  const memberATodos: ITodoAppTodo[] = [];
  for (let i = 0; i < todoCount; i++) {
    const todo = await generate_random_todo_app_member_todos_create(
      memberAConnection,
      {
        body: {
          title: `Member A Todo ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    memberATodos.push(todo);
  }
  // Step 3: Member A deletes some todos (move to trash)
  const deleteCount = 3;
  for (let i = 0; i < deleteCount; i++) {
    await api.functional.todoApp.member.todos.erase(memberAConnection, {
      todoId: memberATodos[i].id,
    });
  }
  // Step 4: Member B authenticates with separate connection
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // Step 5: Member B checks trash - should be empty (data isolation)
  const memberBEmptyTrash =
    await api.functional.todoApp.member.todos.trash.index(memberBConnection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(memberBEmptyTrash);
  TestValidator.equals(
    "Member B trash initially empty",
    memberBEmptyTrash.data.length,
    0,
  );
  TestValidator.equals(
    "Member B trash records count",
    memberBEmptyTrash.pagination.records,
    0,
  );
  TestValidator.equals(
    "Member B trash pages",
    memberBEmptyTrash.pagination.pages,
    0,
  );
  // Step 6: Member B creates and deletes their own todo
  const memberBTodo = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {
      body: {
        title: "Member B Todo for Trash Test",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(memberBTodo);
  await api.functional.todoApp.member.todos.erase(memberBConnection, {
    todoId: memberBTodo.id,
  });
  // Step 7: Member B checks trash again - should only see their own deleted todo
  const memberBTrash = await api.functional.todoApp.member.todos.trash.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTrash);
  // Step 8: Validate pagination metadata
  TestValidator.equals(
    "Member B trash has 1 record",
    memberBTrash.data.length,
    1,
  );
  TestValidator.equals(
    "Member B trash records count",
    memberBTrash.pagination.records,
    1,
  );
  TestValidator.equals(
    "Member B trash current page",
    memberBTrash.pagination.current,
    1,
  );
  TestValidator.equals(
    "Member B trash limit",
    memberBTrash.pagination.limit,
    20,
  );
  TestValidator.equals(
    "Member B trash pages",
    memberBTrash.pagination.pages,
    1,
  );
  // Step 9: Validate todo summary structure
  const deletedTodo = memberBTrash.data[0];
  TestValidator.equals(
    "Deleted todo ID matches",
    deletedTodo.id,
    memberBTodo.id,
  );
  TestValidator.equals(
    "Deleted todo title matches",
    deletedTodo.title,
    memberBTodo.title,
  );
  TestValidator.equals(
    "Deleted todo completed status",
    deletedTodo.completed,
    false,
  );
  TestValidator.predicate(
    "Deleted todo has created_at",
    deletedTodo.created_at !== null,
  );
  TestValidator.predicate(
    "Deleted todo has member",
    deletedTodo.member !== null,
  );
  TestValidator.equals(
    "Deleted todo member ID",
    deletedTodo.member.id,
    memberB.id,
  );
  TestValidator.equals(
    "Deleted todo member display name",
    deletedTodo.member.display_name,
    memberB.display_name,
  );
  // Step 10: Verify Member A still has their deleted todos in trash
  const memberATrash = await api.functional.todoApp.member.todos.trash.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberATrash);
  TestValidator.equals(
    "Member A trash has correct count",
    memberATrash.pagination.records,
    deleteCount,
  );
  TestValidator.predicate(
    "Member A trash has deleted todos",
    memberATrash.data.length === deleteCount,
  );
}
