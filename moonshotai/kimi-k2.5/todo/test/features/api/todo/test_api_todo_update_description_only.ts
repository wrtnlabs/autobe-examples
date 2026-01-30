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

export async function test_api_todo_update_description_only(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});

  // Step 2: Create a new todo item with initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const createBody = {
    title: RandomGenerator.name(3),
    description: initialDescription,
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    { body: createBody },
  );
  typia.assert(createdTodo);

  // Step 3: Update only the description field via PUT endpoint
  const newDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: createdTodo.id,
      body: {
        description: newDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate the response reflects the description change while preserving other fields
  TestValidator.equals(
    "todo id preserved after update",
    updatedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "member association preserved",
    updatedTodo.member.id,
    createdTodo.member.id,
  );
  TestValidator.equals(
    "description field updated",
    (updatedTodo as ITodoAppTodo & { description: string }).description,
    newDescription,
  );
}