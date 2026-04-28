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
 * Test member todo retrieval with all fields populated after creation.
 *
 * Validates the complete workflow where a member registers, creates a todo with all optional fields included, and then retrieves the todo via the GET endpoint. Ensures all returned fields match the created values and that default/system-generated fields are properly populated.
 *
 * The test verifies that is_completed defaults to false for newly created todos, that deleted_at is null for active todos, and that the member object correctly references the authenticated member.
 *
 * 1. Register and authenticate as a member.
 * 2. Create a todo with title, description, start_date, and due_date.
 * 3. Retrieve the created todo using its ID.
 * 4. Validate all fields match the input data and defaults.
 */
export async function test_api_todo_view_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo with all optional fields populated
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400 * 1000 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // 3. Retrieve the created todo using its ID
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate fields match input and defaults
  TestValidator.equals(
    "title matches created value",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "description matches created value",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "start_date matches created value",
    retrievedTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "due_date matches created value",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "is_completed defaults to false",
    retrievedTodo.is_completed,
    false,
  );
  TestValidator.predicate(
    "created_at is populated",
    retrievedTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    retrievedTodo.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active todo",
    retrievedTodo.deleted_at,
    null,
  );
  TestValidator.equals(
    "member id matches authenticated member",
    retrievedTodo.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member email matches authenticated member",
    retrievedTodo.member.email,
    memberAuth.email,
  );
}
