import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_detail_retrieval_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const memberId = authorized.id;
  // 2. Create a todo with ALL optional fields populated
  const title1 = RandomGenerator.paragraph({ sentences: 3 });
  const description1 = RandomGenerator.content({ paragraphs: 2 });
  const started_at1 = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now
  const due_at1 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days from now
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: title1,
        description: description1,
        started_at: started_at1,
        due_at: due_at1,
      },
    },
  );
  typia.assert(createdTodo);
  // 3. Retrieve the full todo by ID
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate all fields from the full todo
  TestValidator.equals("todo id matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals(
    "todo member id matches authenticated member",
    retrievedTodo.todo_app_member_id,
    memberId,
  );
  TestValidator.equals("todo title matches", retrievedTodo.title, title1);
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    description1,
  );
  TestValidator.equals(
    "todo is_completed is false by default",
    retrievedTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "todo started_at matches",
    retrievedTodo.started_at,
    started_at1,
  );
  TestValidator.equals("todo due_at matches", retrievedTodo.due_at, due_at1);
  TestValidator.equals(
    "todo trashed_at is null (active todo)",
    retrievedTodo.trashed_at,
    null,
  );
  // 5. Create a minimal todo with only the required title
  const title2 = RandomGenerator.paragraph({ sentences: 2 });
  const minimalTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: title2,
        description: null,
        started_at: null,
        due_at: null,
      },
    },
  );
  typia.assert(minimalTodo);
  // 6. Retrieve the minimal todo by ID
  const retrievedMinimalTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: minimalTodo.id,
    },
  );
  typia.assert(retrievedMinimalTodo);
  // 7. Validate minimal fields: optional fields should all be null
  TestValidator.equals(
    "minimal todo title matches",
    retrievedMinimalTodo.title,
    title2,
  );
  TestValidator.equals(
    "minimal todo description is null",
    retrievedMinimalTodo.description,
    null,
  );
  TestValidator.equals(
    "minimal todo started_at is null",
    retrievedMinimalTodo.started_at,
    null,
  );
  TestValidator.equals(
    "minimal todo due_at is null",
    retrievedMinimalTodo.due_at,
    null,
  );
  TestValidator.equals(
    "minimal todo is_completed is false",
    retrievedMinimalTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "minimal todo trashed_at is null",
    retrievedMinimalTodo.trashed_at,
    null,
  );
}
