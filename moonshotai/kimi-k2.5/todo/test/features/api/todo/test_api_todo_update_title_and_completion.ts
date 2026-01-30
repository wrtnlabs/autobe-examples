import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_todo_update_title_and_completion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins and authenticates via /auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com",
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Creates a new todo item via POST /member/todos
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
    due_date: new Date().toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: createBody,
    },
  );
  typia.assert(todo);
  // Step 3: Updates the todo via PUT /member/todos/{todoId}
  // ITodoAppTodo.IUpdate is defined as {} in provided DTOs
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: typia.random<ITodoAppTodo.IUpdate>(),
    },
  );
  typia.assert(updatedTodo);
  // Step 4: Validates the response contains valid todo data
  TestValidator.equals(
    "todo id should remain consistent",
    updatedTodo.id,
    todo.id,
  );
  TestValidator.equals(
    "member should be the owner",
    updatedTodo.member.id,
    authorizedMember.id,
  );
}
