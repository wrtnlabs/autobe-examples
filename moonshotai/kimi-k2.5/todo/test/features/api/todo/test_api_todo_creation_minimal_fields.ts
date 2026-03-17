import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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
 * Test minimal todo creation with only required title field.
 * Validates that optional fields default to null and completion status is false.
 *
 * 1. Authenticate as member using authorize_member_join
 * 2. Create todo with only title field using generate_random_multi_user_todo_member_todos_create
 * 3. Verify response has title as provided, null optional fields, and correct default statuses
 */
export async function test_api_todo_creation_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create dedicated member connection for authentication isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as member using utility function
  await authorize_member_join(memberConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string) as string,
      password: RandomGenerator.alphaNumeric(16),
      href: (typia.random<string & tags.Format<"url">>() satisfies string) as string,
      referrer: (typia.random<string & tags.Format<"url">>() satisfies string) as string,
    },
  });
  // Step 2: Create todo with only title (minimal fields required)
  const todoTitle = RandomGenerator.name();
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: { title: todoTitle } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Step 3: Validate minimal creation business logic
  TestValidator.equals("title matches input", todo.title, todoTitle);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("startDate is null", todo.startDate, null);
  TestValidator.equals("dueDate is null", todo.dueDate, null);
  TestValidator.equals(
    "isComplete is false by default",
    todo.isComplete,
    false,
  );
  TestValidator.equals(
    "completedAt is null for incomplete todo",
    todo.completedAt,
    null,
  );
}
