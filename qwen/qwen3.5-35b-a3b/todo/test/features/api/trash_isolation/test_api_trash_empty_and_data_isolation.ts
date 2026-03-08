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

export async function test_api_trash_empty_and_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test empty trash for fresh member
  const freshConnection: api.IConnection = { host: connection.host };
  const freshMember = await authorize_member_join(freshConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(freshMember);
  // Fetch trash list for fresh member (should be empty)
  const emptyTrash = await api.functional.todoApp.member.todos.trash.index(
    freshConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptyTrash);
  // Validate empty trash response structure
  TestValidator.equals("trash data is empty", emptyTrash.data.length, 0);
  TestValidator.equals(
    "pagination current page is 1",
    emptyTrash.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptyTrash.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", emptyTrash.pagination.pages, 0);
  TestValidator.equals(
    "pagination limit is 20",
    emptyTrash.pagination.limit,
    20,
  );
  // 2. Create two members for isolation test
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // MemberA creates a todo
  const todoA = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: "Todo created by memberA",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // MemberA soft deletes the todo (moves to trash)
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todoA.id,
  });
  // 3. Verify memberB's trash is empty (data isolation)
  const memberBTrash = await api.functional.todoApp.member.todos.trash.index(
    memberBConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTrash);
  // Validate cross-user isolation
  TestValidator.equals(
    "memberB trash data is empty (isolation)",
    memberBTrash.data.length,
    0,
  );
  TestValidator.equals(
    "memberB pagination records is 0 (isolation)",
    memberBTrash.pagination.records,
    0,
  );
  // 4. Verify memberA's trash has the deleted todo with non-null deleted_at
  const memberATrash = await api.functional.todoApp.member.todos.trash.index(
    memberAConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberATrash);
  // Validate memberA's trash contains the deleted todo
  TestValidator.equals("memberA trash has 1 todo", memberATrash.data.length, 1);
  TestValidator.equals(
    "memberA pagination records is 1",
    memberATrash.pagination.records,
    1,
  );
  // Validate deleted_at is non-null for the todo in trash
  const trashTodo = memberATrash.data[0];
  typia.assert(trashTodo);
  TestValidator.predicate(
    "deleted_at is non-null for trash todo",
    trashTodo.deleted_at !== null,
  );
}
