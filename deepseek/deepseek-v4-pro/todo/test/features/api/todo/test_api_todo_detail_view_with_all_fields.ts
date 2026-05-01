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
 * Test retrieving a single todo with all fields populated via ID lookup.
 *
 * Validates that the todo detail endpoint returns every field correctly when a todo is created with full information. Ensures title, description, start_date, and due_date are preserved exactly as submitted, system-managed fields like completed_at default to null, and timestamps are consistent. Also confirms that the member_id is never exposed in the response.
 *
 * 1. Member registers and authenticates via join.
 * 2. Member creates a todo with all optional fields: title, description, start_date, and due_date.
 * 3. Member retrieves the created todo by its ID.
 * 4. Validates all response fields: title, description, dates, completion status, timestamps, and no member_id leak.
 */
export async function test_api_todo_detail_view_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with all fields populated
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const startDate = new Date(Date.now() + 86400000).toISOString() as string &
    tags.Format<"date-time">;
  const dueDate = new Date(Date.now() + 7 * 86400000).toISOString() as string &
    tags.Format<"date-time">;
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_date: startDate,
        due_date: dueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo by ID
  const retrieved = await api.functional.todoApp.member.todos.at(
    memberConnection,
    { todoId: todo.id },
  );
  typia.assert(retrieved);
  // 4. Validate all fields
  TestValidator.equals("id matches created todo", retrieved.id, todo.id);
  TestValidator.equals("title matches input", retrieved.title, title);
  TestValidator.equals(
    "description matches input",
    retrieved.description,
    description,
  );
  TestValidator.equals(
    "start_date matches input",
    retrieved.start_date,
    startDate,
  );
  TestValidator.equals("due_date matches input", retrieved.due_date, dueDate);
  TestValidator.equals(
    "completed_at is null by default",
    retrieved.completed_at,
    null,
  );
  TestValidator.predicate(
    "created_at is non-null",
    retrieved.created_at !== null,
  );
  TestValidator.equals(
    "created_at matches created todo",
    retrieved.created_at,
    todo.created_at,
  );
  TestValidator.equals(
    "updated_at equals created_at for unmodified todo",
    retrieved.updated_at,
    retrieved.created_at,
  );
}
