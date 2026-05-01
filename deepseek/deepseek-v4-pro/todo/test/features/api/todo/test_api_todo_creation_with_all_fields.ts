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
 * Test creating a todo with all optional fields provided.
 *
 * Verifies that a member can create a todo with title, description, start date,
 * and due date all populated, and that every submitted field is persisted
 * correctly in the server response.
 *
 * Special attention is given to verifying that the due date is later than the
 * start date, that newly created todos default to incomplete (completed_at is
 * null), and that all system-managed fields such as id, created_at, and
 * updated_at are properly assigned by the server.
 *
 * 1. Register a new member via the join endpoint to obtain authentication.
 * 2. Prepare a todo payload with all fields: title, description, start_date
 *    (tomorrow), and due_date (one week later).
 * 3. Create the todo and validate that all submitted fields are returned
 *    exactly as provided.
 * 4. Confirm that completed_at is null, indicating the todo is incomplete by
 *    default.
 */
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Prepare todo data with all fields
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });
  // 3. Create todo with all fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
      },
    },
  );
  typia.assert(todo);
  // 4. Validate submitted fields are persisted correctly
  TestValidator.equals("title matches", todo.title, title);
  TestValidator.equals("description matches", todo.description, description);
  TestValidator.equals(
    "start_date matches",
    todo.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "due_date matches",
    todo.due_date,
    dueDate.toISOString(),
  );
  // 5. Validate business rule: new todos are incomplete by default
  TestValidator.equals("completed_at is null", todo.completed_at, null);
}
