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
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/todo/register",
      referrer: "https://example.com",
    } satisfies ITodoAppMember.IJoin,
  });
  // Step 2: Create a todo item
  const todoCreateInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
    due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(memberConnection, {
      body: todoCreateInput,
    });
  typia.assert(createdTodo);
  // Step 3: Retrieve the todo by ID
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.at(memberConnection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);
  // Step 4: Validate the retrieved todo matches the created one
  TestValidator.equals(
    "retrieved todo id matches created todo id",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo member matches",
    retrievedTodo.member.id,
    createdTodo.member.id,
  );
}
