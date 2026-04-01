import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test retrieving an active todo item that belongs to the authenticated member.
 *
 * This test validates the primary success path of viewing a single todo with full details.
 *
 * Workflow:
 * 1. Register a new member account
 * 2. Create a todo with all fields (title, description, start date, due date)
 * 3. Retrieve the created todo by ID
 * 4. Validate response structure and field values
 */
export async function test_api_member_todo_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create a todo with all fields
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      },
    },
  );
  typia.assert(createdTodo);
  // 3. Retrieve the created todo by ID
  const retrievedTodo = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate the retrieved todo matches the created todo
  TestValidator.equals("todo id matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("title matches", retrievedTodo.title, createdTodo.title);
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "started_at matches",
    retrievedTodo.started_at,
    createdTodo.started_at,
  );
  TestValidator.equals(
    "due_at matches",
    retrievedTodo.due_at,
    createdTodo.due_at,
  );
  // 5. Validate completion status is incomplete by default
  TestValidator.predicate(
    "completed_at is null (incomplete)",
    retrievedTodo.completed_at === null,
  );
  // 6. Validate deleted_at is null (active todo)
  TestValidator.predicate(
    "deleted_at is null (active)",
    retrievedTodo.deleted_at === null,
  );
  // 7. Validate member information
  TestValidator.equals(
    "member id matches",
    retrievedTodo.member.id,
    joinResult.id,
  );
  // 8. Validate editHistories is an array
  TestValidator.predicate(
    "editHistories is array",
    Array.isArray(retrievedTodo.editHistories),
  );
}
