import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_trash_view_deleted_todo(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and authenticate as a member
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new todo
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      },
    },
  );
  typia.assert(createdTodo);
  // Step 3: Delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // Step 4: Retrieve the deleted todo from trash
  const trashedTodo = await api.functional.todoApp.member.trash.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(trashedTodo);
  // Step 5: Validate the response
  TestValidator.equals("id matches", trashedTodo.id, createdTodo.id);
  TestValidator.equals("title matches", trashedTodo.title, createdTodo.title);
  TestValidator.equals(
    "description matches",
    trashedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "startDate matches",
    trashedTodo.startDate,
    createdTodo.startDate,
  );
  TestValidator.equals(
    "dueDate matches",
    trashedTodo.dueDate,
    createdTodo.dueDate,
  );
  TestValidator.equals(
    "completed status matches",
    trashedTodo.completed,
    createdTodo.completed,
  );
  TestValidator.equals(
    "createdAt matches",
    trashedTodo.createdAt,
    createdTodo.createdAt,
  );
  TestValidator.predicate(
    "deletedAt is not null",
    trashedTodo.deletedAt !== null,
  );
  TestValidator.predicate(
    "updatedAt is after or equal to createdAt",
    new Date(trashedTodo.updatedAt) >= new Date(trashedTodo.createdAt),
  );
}
