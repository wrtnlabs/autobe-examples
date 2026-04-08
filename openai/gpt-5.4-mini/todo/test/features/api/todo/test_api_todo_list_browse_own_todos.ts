import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_list_browse_own_todos(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "1234",
    } satisfies ITodoAppMember.IJoin,
  });
  const baseDate = new Date();
  const startDate1 = new Date(
    baseDate.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const dueDate1 = new Date(
    baseDate.getTime() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const startDate2 = new Date(
    baseDate.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dueDate2 = new Date(
    baseDate.getTime() + 4 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdTodos: ITodoAppTodo[] = [];
  createdTodos.push(
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        startDate: startDate1,
        dueDate: dueDate1,
      } satisfies ITodoAppTodo.ICreate,
    }),
  );
  createdTodos.push(
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    }),
  );
  createdTodos.push(
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: startDate2,
        dueDate: dueDate2,
      } satisfies ITodoAppTodo.ICreate,
    }),
  );
  const output = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 2);
  TestValidator.equals(
    "pagination records",
    output.pagination.records,
    createdTodos.length,
  );
  TestValidator.equals("pagination pages", output.pagination.pages, 2);
  TestValidator.equals("returned page size", output.data.length, 2);
  TestValidator.equals(
    "first page contains created todos in order",
    output.data.map((todo) => todo.id),
    createdTodos.slice(0, 2).map((todo) => todo.id),
  );
  for (const todo of output.data) {
    TestValidator.predicate(
      "owner summary exists",
      todo.member !== null && todo.member !== undefined,
    );
    TestValidator.predicate("title exists", todo.title.length > 0);
    TestValidator.predicate(
      "completion flag is boolean",
      typeof todo.isCompleted === "boolean",
    );
    TestValidator.predicate("createdAt exists", todo.createdAt.length > 0);
    TestValidator.predicate("updatedAt exists", todo.updatedAt.length > 0);
    TestValidator.equals("todo is active in normal list", todo.deletedAt, null);
  }
}
