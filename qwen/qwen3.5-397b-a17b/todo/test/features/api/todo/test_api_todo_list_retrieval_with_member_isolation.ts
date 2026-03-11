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
 * Test the primary success path for retrieving a member's active todo list.
 * 1. Register and authenticate as a member
 * 2. Create multiple todos with varying titles, descriptions, and date fields
 * 3. Call the list endpoint with default parameters
 * 4. Verify response contains only the authenticated member's todos
 * 5. Validate pagination metadata and todo summary fields
 * 6. Confirm privacy isolation by ensuring no other members' todos appear
 */
export async function test_api_todo_list_retrieval_with_member_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple todos with varying data
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        start_date: null,
        due_date: null,
      },
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        start_date: new Date().toISOString(),
        due_date: null,
      },
    },
  );
  typia.assert(todo3);
  // 3. Retrieve todo list with default parameters
  const todoList = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        direction: "DESC",
        deleted: false,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todoList);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", todoList.pagination.current, 1);
  TestValidator.predicate("limit is positive", todoList.pagination.limit > 0);
  TestValidator.equals("records count", todoList.pagination.records, 3);
  TestValidator.predicate(
    "pages calculated correctly",
    todoList.pagination.pages >= 1,
  );
  // 5. Validate todo list contains created todos
  TestValidator.equals("todo count matches", todoList.data.length, 3);
  const todoIds = todoList.data.map((t) => t.id);
  TestValidator.predicate("contains todo1", todoIds.includes(todo1.id));
  TestValidator.predicate("contains todo2", todoIds.includes(todo2.id));
  TestValidator.predicate("contains todo3", todoIds.includes(todo3.id));
  // 6. Validate each todo has required fields and correct values
  for (const todo of todoList.data) {
    TestValidator.predicate("has non-empty title", todo.title.length > 0);
    TestValidator.predicate(
      "has completed flag",
      typeof todo.completed === "boolean",
    );
    TestValidator.predicate(
      "deleted_at is null for active",
      todo.deleted_at === null,
    );
    TestValidator.equals("member id matches", todo.member.id, memberAuth.id);
    TestValidator.equals(
      "member display name matches",
      todo.member.display_name,
      memberAuth.display_name,
    );
  }
  // 7. Validate specific todo data
  const retrievedTodo1 = todoList.data.find((t) => t.id === todo1.id)!;
  TestValidator.equals(
    "todo1 title matches",
    retrievedTodo1.title,
    todo1.title,
  );
  TestValidator.equals(
    "todo1 description matches",
    retrievedTodo1.description,
    todo1.description,
  );
  const retrievedTodo2 = todoList.data.find((t) => t.id === todo2.id)!;
  TestValidator.equals(
    "todo2 description is null",
    retrievedTodo2.description,
    null,
  );
  TestValidator.equals(
    "todo2 start_date is null",
    retrievedTodo2.start_date,
    null,
  );
  TestValidator.equals("todo2 due_date is null", retrievedTodo2.due_date, null);
  // 8. Test privacy isolation - create another member and verify they can't see first member's todos
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMemberAuth = await authorize_member_join(
    anotherMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(anotherMemberAuth);
  const anotherMemberTodos = await api.functional.todoApp.member.todos.index(
    anotherMemberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        deleted: false,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(anotherMemberTodos);
  const anotherMemberTodoIds = anotherMemberTodos.data.map((t) => t.id);
  TestValidator.predicate(
    "no todo1 in another member's list",
    !anotherMemberTodoIds.includes(todo1.id),
  );
  TestValidator.predicate(
    "no todo2 in another member's list",
    !anotherMemberTodoIds.includes(todo2.id),
  );
  TestValidator.predicate(
    "no todo3 in another member's list",
    !anotherMemberTodoIds.includes(todo3.id),
  );
  for (const todo of anotherMemberTodos.data) {
    TestValidator.equals(
      "another member's todo owner",
      todo.member.id,
      anotherMemberAuth.id,
    );
  }
}
