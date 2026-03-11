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
 * Test the primary success path of creating a basic todo with only required fields.
 * As an authenticated member, create a new todo with just a title (minimum required field).
 * Verify the todo is created successfully with system-generated fields including UUID ID,
 * timestamps (created_at, updated_at), default completion status (is_completed = false),
 * null for optional fields (description, start_date, due_date, deleted_at), and correct
 * member ownership information. Ensure the title is properly stored and returned in
 * the response. Validate that the todo appears in subsequent todo list queries.
 */
export async function test_api_todo_creation_basic_with_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Prepare todo creation data with only required title
  const title = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 5,
  });
  const body = {
    title,
  } satisfies IMultiUserTodoTodo.ICreate;
  // 3. Create todo using utility function
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    { body },
  );
  typia.assert(todo);
  // 4. Validate response structure and business logic
  TestValidator.equals("todo title matches input", todo.title, title);
  TestValidator.equals(
    "todo is incomplete by default",
    todo.is_completed,
    false,
  );
  TestValidator.equals(
    "description is null when not provided",
    todo.description,
    null,
  );
  TestValidator.equals(
    "start_date is null when not provided",
    todo.start_date,
    null,
  );
  TestValidator.equals(
    "due_date is null when not provided",
    todo.due_date,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active todo",
    todo.deleted_at,
    null,
  );
  // 5. Validate member ownership
  TestValidator.equals("todo belongs to creator", todo.member.id, member.id);
  TestValidator.equals("member email matches", todo.member.email, member.email);
  TestValidator.equals(
    "member display_name matches",
    todo.member.display_name,
    member.display_name,
  );
  // 6. Validate timestamps
  TestValidator.predicate("created_at is valid ISO string", () => {
    return !isNaN(new Date(todo.created_at).getTime());
  });
  TestValidator.predicate("updated_at is valid ISO string", () => {
    return !isNaN(new Date(todo.updated_at).getTime());
  });
  TestValidator.predicate("created_at and updated_at are close in time", () => {
    const created = new Date(todo.created_at).getTime();
    const updated = new Date(todo.updated_at).getTime();
    return Math.abs(created - updated) < 1000; // within 1 second
  });
  // 7. Validate UUID format (implicit via typia.assert but explicit for clarity)
  TestValidator.predicate("id is valid UUID format", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    );
  });
}
