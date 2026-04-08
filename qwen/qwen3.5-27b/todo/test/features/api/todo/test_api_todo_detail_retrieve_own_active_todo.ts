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
 * Test that an authenticated member can retrieve complete details of their own active todo.
 *
 * Validates the full todo detail retrieval flow including member authentication, todo creation with all fields, and detail retrieval. Ensures that the response includes all fields: id, title, description, start_date, due_date, completed status, created_at, updated_at, deleted_at (should be null for active todos), and the member object. The todo must be created by the authenticated member and must not be soft-deleted.
 *
 * Special attention is given to verifying that newly created todos are incomplete by default (completed: false) and that the deleted_at field is null for active todos. The member relationship must be correctly populated with the authenticated member's summary information.
 *
 * 1. Authenticate as a new member with email, password, and display name.
 * 2. Create a todo with title, description, start_date, and due_date.
 * 3. Retrieve the todo detail using the todo id.
 * 4. Validate all fields are present and have correct values.
 * 5. Verify deleted_at is null and completed is false.
 */
export async function test_api_todo_detail_retrieve_own_active_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create a todo with all fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo detail
  const retrieved = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate all fields are present and correct
  TestValidator.equals("todo id matches", retrieved.id, todo.id);
  TestValidator.equals("title matches", retrieved.title, todo.title);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    todo.description,
  );
  TestValidator.equals(
    "start_date matches",
    retrieved.start_date,
    todo.start_date,
  );
  TestValidator.equals("due_date matches", retrieved.due_date, todo.due_date);
  // 5. Verify active todo properties
  TestValidator.equals(
    "deleted_at is null for active todo",
    retrieved.deleted_at,
    null,
  );
  TestValidator.equals(
    "completed is false by default",
    retrieved.completed,
    false,
  );
  // 6. Validate member relationship
  TestValidator.equals("member id matches", retrieved.member.id, member.id);
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    member.email,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrieved.updated_at !== undefined,
  );
}
