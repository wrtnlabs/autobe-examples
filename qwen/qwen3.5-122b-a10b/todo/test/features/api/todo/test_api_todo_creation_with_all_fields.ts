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
 * Test todo creation with all fields for authenticated member.
 *
 * Validates the complete todo creation workflow including member authentication, todo task creation with full details, and response validation. Ensures that all provided fields are correctly stored and returned with proper defaults.
 *
 * Special attention is given to verifying that the completion status defaults to incomplete, the author reference matches the authenticated member, and all timestamps are properly formatted.
 *
 * 1. Member authenticates via registration endpoint.
 * 2. Member creates todo with title, description, start_date, and due_date.
 * 3. Validates todo has all fields including generated UUID id.
 * 4. Verifies is_completed defaults to false.
 * 5. Verifies author field contains correct member summary.
 * 6. Verifies created_at and updated_at are valid ISO 8601 timestamps.
 * 7. Verifies all input fields (title, description, start_date, due_date) are returned correctly.
 */
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(member);
  // 2. Prepare input data with all fields
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const description = RandomGenerator.paragraph({ sentences: 10 });
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // 7 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14); // 14 days from now
  // 3. Create todo with all fields
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Validate completion status defaults to incomplete
  TestValidator.predicate(
    "is_completed defaults to false",
    todo.is_completed === false,
  );
  // 5. Validate author matches authenticated member
  TestValidator.equals("author id matches member", todo.author.id, member.id);
  TestValidator.equals(
    "author display_name matches",
    todo.author.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "author has created_at",
    todo.author.created_at !== null,
  );
  // 6. Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(todo.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(todo.updated_at)),
  );
  // 7. Validate UUID format for id
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  // 8. Validate all input fields are returned correctly
  TestValidator.equals("title matches input", todo.title, title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    description,
  );
  TestValidator.equals(
    "start_date matches input",
    todo.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "due_date matches input",
    todo.due_date,
    dueDate.toISOString(),
  );
}
