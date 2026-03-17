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
 * Test member data isolation - verify each member can only access their own todos.
 *
 * This test validates the fundamental privacy requirement that todos are completely
 * isolated between users. Two separate members are created, each creates multiple
 * todos, and we verify that:
 * 1. Each member can only see their own todos in the list
 * 2. Pagination records count reflects only the requesting member's todos
 * 3. Todo summaries contain correct member ownership information
 * 4. No cross-contamination between member todo lists
 */
export async function test_api_todo_list_member_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member authentication and setup
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. First member creates 3 todos
  const member1Todos = await Promise.all(ArrayUtil.repeat(3, async () => {
    const todo = await generate_random_todo_app_member_todos_create(
      member1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          started_at: new Date().toISOString(),
          due_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  }));
  // 3. Second member authentication and setup
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2Auth);
  // 4. Second member creates 2 todos
  const member2Todos = await Promise.all(ArrayUtil.repeat(2, async () => {
    const todo = await generate_random_todo_app_member_todos_create(
      member2Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          started_at: new Date().toISOString(),
          due_at: new Date(Date.now() + 86400000 * 14).toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  }));
  // 5. First member requests their todo list
  const member1List = await api.functional.todoApp.member.todos.index(
    member1Connection,
    {
      body: {
        page: 1,
        limit: 20,
        completed: "all",
        sort: "created_at",
        order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(member1List);
  // 6. Verify first member sees exactly 3 todos (their own)
  TestValidator.equals("member1 todo count", member1List.pagination.records, 3);
  TestValidator.equals("member1 data length", member1List.data.length, 3);
  // 7. Verify all todos in member1's list belong to member1
  for (const todo of member1List.data) {
    TestValidator.equals("member1 todo owner", todo.member.id, member1Auth.id);
    TestValidator.equals(
      "member1 todo display name",
      todo.member.display_name,
      member1Auth.display_name,
    );
  }
  // 8. Second member requests their todo list
  const member2List = await api.functional.todoApp.member.todos.index(
    member2Connection,
    {
      body: {
        page: 1,
        limit: 20,
        completed: "all",
        sort: "created_at",
        order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(member2List);
  // 9. Verify second member sees exactly 2 todos (their own)
  TestValidator.equals("member2 todo count", member2List.pagination.records, 2);
  TestValidator.equals("member2 data length", member2List.data.length, 2);
  // 10. Verify all todos in member2's list belong to member2
  for (const todo of member2List.data) {
    TestValidator.equals("member2 todo owner", todo.member.id, member2Auth.id);
    TestValidator.equals(
      "member2 todo display name",
      todo.member.display_name,
      member2Auth.display_name,
    );
  }
  // 11. Verify no cross-contamination - member1's todos don't appear in member2's list
  const member1TodoIds = member1Todos.map((t) => t.id);
  const member2TodoIds = member2Todos.map((t) => t.id);
  for (const todo of member2List.data) {
    TestValidator.predicate(
      "member2 list excludes member1 todos",
      !member1TodoIds.includes(todo.id),
    );
  }
  for (const todo of member1List.data) {
    TestValidator.predicate(
      "member1 list excludes member2 todos",
      !member2TodoIds.includes(todo.id),
    );
  }
  // 12. Verify member IDs are different (ensuring truly separate accounts)
  TestValidator.notEquals("member IDs differ", member1Auth.id, member2Auth.id);
  // 13. Verify display names are different
  TestValidator.notEquals(
    "member display names differ",
    member1Auth.display_name,
    member2Auth.display_name,
  );
}