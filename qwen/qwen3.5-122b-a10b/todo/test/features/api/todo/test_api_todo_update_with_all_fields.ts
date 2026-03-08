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

export async function test_api_todo_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create initial todo
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Initial Todo Title",
        description: "Initial description",
        startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        dueDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // 3. Update todo with all fields
  const updateBody = {
    title: "Updated Todo Title",
    description: "Updated description with all fields",
    startDate: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    dueDate: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
    completed: true,
  } satisfies ITodoAppTodo.IUpdate;
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify all fields were updated correctly
  TestValidator.equals("title updated", updatedTodo.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updateBody.description,
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    updateBody.startDate,
  );
  TestValidator.equals(
    "due_date updated",
    updatedTodo.due_date,
    updateBody.dueDate,
  );
  TestValidator.equals(
    "completed updated",
    updatedTodo.completed,
    updateBody.completed,
  );
  // 5. Verify timestamps
  TestValidator.predicate("created_at exists", updatedTodo.created_at !== null);
  TestValidator.predicate("updated_at exists", updatedTodo.updated_at !== null);
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedTodo.updated_at) > new Date(updatedTodo.created_at),
  );
  // 6. Verify author information
  TestValidator.equals("author id matches", updatedTodo.author.id, member.id);
  TestValidator.equals(
    "author display name matches",
    updatedTodo.author.display_name,
    member.displayName,
  );
}
