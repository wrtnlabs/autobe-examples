import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_todo_list_privacy_and_trash_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first member account and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() as string) satisfies string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: "1234" + RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // Create second member account and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() as string) satisfies string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: "1234" + RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // Member1 creates todos
  const todo1A = await api.functional.todoApp.member.todos.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1A);
  const todo1B = await api.functional.todoApp.member.todos.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1B);
  const todo1C = await api.functional.todoApp.member.todos.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1C);
  // Member2 creates todos
  const todo2A = await api.functional.todoApp.member.todos.create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2A);
  // Member1 trash some todos
  await api.functional.todoApp.member.todos.erase(member1Connection, {
    todoId: todo1A.id,
  });
  await api.functional.todoApp.member.todos.erase(member1Connection, {
    todoId: todo1C.id,
  });
  // Verify member1's list excludes trashed and other member's todos
  const member1List = await api.functional.todoApp.member.todos.index(
    member1Connection,
    {
      body: { status: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(member1List);
  TestValidator.equals(
    "member1 list contains only active todos",
    member1List.data.length,
    1,
  );
  TestValidator.equals(
    "member1 list contains correct todo",
    member1List.data[0].id,
    todo1B.id,
  );
  TestValidator.equals(
    "member1 list has correct user",
    member1List.data[0].user.id,
    member1.member.id,
  );
  // Verify member2's list excludes member1's todos
  const member2List = await api.functional.todoApp.member.todos.index(
    member2Connection,
    {
      body: { status: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(member2List);
  TestValidator.equals(
    "member2 list contains only member2's todo",
    member2List.data.length,
    1,
  );
  TestValidator.equals(
    "member2 list contains correct todo",
    member2List.data[0].id,
    todo2A.id,
  );
  TestValidator.equals(
    "member2 list has correct user",
    member2List.data[0].user.id,
    member2.member.id,
  );
}