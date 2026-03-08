import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
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

export async function test_api_todo_list_user_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.todoApp.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberA);
  memberAConnection.headers = {
    ...memberAConnection.headers,
    Authorization: memberA.token.access,
  };
  // Step 2: Create Member B account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await api.functional.todoApp.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberB);
  memberBConnection.headers = {
    ...memberBConnection.headers,
    Authorization: memberB.token.access,
  };
  // Step 3: Member A creates todos
  const todoA1 = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(2),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA1);
  const todoA2 = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(2),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA2);
  const todoA3 = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA3);
  // Step 4: Member B creates different todos
  const todoB1 = await api.functional.todoApp.member.todos.create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.name(3),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB1);
  const todoB2 = await api.functional.todoApp.member.todos.create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.name(3),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB2);
  // Step 5: Member A fetches their todos (should only see A's todos)
  const memberATodos = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberATodos);
  // Step 6: Verify Member A's todos list contains only A's todos
  const memberATodoIds = new Set([todoA1.id, todoA2.id, todoA3.id]);
  memberATodos.data.forEach((todo) => {
    TestValidator.predicate(
      "todo belongs to member A",
      memberATodoIds.has(todo.id),
    );
  });
  // Step 7: Verify pagination count matches Member A's actual todo count
  TestValidator.equals(
    "member A todo count",
    memberATodos.pagination.records,
    3,
  );
  // Step 8: Member B fetches their todos (should only see B's todos)
  const memberBTodos = await api.functional.todoApp.member.todos.index(
    memberBConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTodos);
  // Step 9: Verify Member B's todos list contains only B's todos
  const memberBTodoIds = new Set([todoB1.id, todoB2.id]);
  memberBTodos.data.forEach((todo) => {
    TestValidator.predicate(
      "todo belongs to member B",
      memberBTodoIds.has(todo.id),
    );
  });
  // Step 10: Verify pagination count matches Member B's actual todo count
  TestValidator.equals(
    "member B todo count",
    memberBTodos.pagination.records,
    2,
  );
}
