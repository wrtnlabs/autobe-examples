import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
 * Test that an authenticated member can successfully retrieve their own active todo by ID.
 *
 * Validates the complete todo retrieval flow including member authentication, todo creation, and single todo retrieval by UUID. Ensures that the retrieved todo contains all expected fields with correct values and that the member relation is properly resolved.
 *
 * Special attention is given to verifying that the todo belongs to the authenticated member, that default values are correctly applied (isCompleted=false, isDeleted=false, deletedAt=null), and that the edit histories array is present even when empty.
 *
 * 1. Member authenticates via join endpoint to obtain JWT tokens.
 * 2. Member creates a todo with title, description, start date, and due date.
 * 3. Member retrieves the created todo by its UUID.
 * 4. Validates all todo fields match the created values and default states.
 */
export async function test_api_todo_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a todo
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Test Todo",
        description: "Test description",
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // 3. Retrieve the todo by ID
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate todo fields
  TestValidator.equals("todo ID matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("title matches", retrievedTodo.title, "Test Todo");
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    "Test description",
  );
  TestValidator.predicate("is not completed", !retrievedTodo.isCompleted);
  TestValidator.predicate("is not deleted", !retrievedTodo.isDeleted);
  TestValidator.equals("deletedAt is null", retrievedTodo.deletedAt, null);
  TestValidator.equals(
    "member ID matches",
    retrievedTodo.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member display name matches",
    retrievedTodo.member.display_name,
    authorized.display_name,
  );
}
