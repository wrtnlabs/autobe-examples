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

/**
 * Test that a member can retrieve a todo with optional fields set to null.
 *
 * This test validates the optional field handling in the todo entity by:
 * 1. Registering a new member account
 * 2. Creating a todo with only the required title field (description, started_at, due_at as null)
 * 3. Retrieving the todo using its ID
 * 4. Validating that optional fields are null and required fields are populated
 */
export async function test_api_todo_retrieval_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a todo with only the required title field
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo using its ID
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate optional fields are null
  TestValidator.equals("description is null", retrievedTodo.description, null);
  TestValidator.equals("started_at is null", retrievedTodo.started_at, null);
  TestValidator.equals("due_at is null", retrievedTodo.due_at, null);
  // 5. Validate required fields are populated
  TestValidator.equals("title matches input", retrievedTodo.title, todo.title);
  TestValidator.predicate(
    "completed is false by default",
    !retrievedTodo.completed,
  );
  TestValidator.equals(
    "member id matches",
    retrievedTodo.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member display name matches",
    retrievedTodo.member.display_name,
    authorized.display_name,
  );
}
