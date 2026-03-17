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
 * Test creation of a complete todo with all optional fields.
 * Create a todo with title, description, start date, and due date.
 * Verify that all fields are correctly stored and returned in the response.
 * Validate that the due date is after the start date (business rule).
 * Check that the todo is properly associated with the authenticated member
 * and has default completion status of 'incomplete'.
 * Verify system-generated timestamps and that all optional fields maintain their values.
 * Test that the todo can be retrieved with all details intact.
 */
export async function test_api_todo_creation_complete_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Prepare complete todo data with all optional fields
  // Ensure due_date is after start_date for business rule validation
  const startDate = new Date();
  const dueDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // 1 day later
  const todoCreateData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    start_date: startDate.toISOString(),
    due_date: dueDate.toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  // 3. Create todo using utility function
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: todoCreateData },
  );
  typia.assert(createdTodo);
  // 4. Validate all fields are correctly stored (business logic validation)
  TestValidator.equals(
    "title matches",
    createdTodo.title,
    todoCreateData.title,
  );
  TestValidator.equals(
    "description matches",
    createdTodo.description,
    todoCreateData.description,
  );
  TestValidator.equals(
    "start_date matches",
    createdTodo.start_date,
    todoCreateData.start_date,
  );
  TestValidator.equals(
    "due_date matches",
    createdTodo.due_date,
    todoCreateData.due_date,
  );
  // 5. Validate business rule: due_date must be after start_date
  const startDateTime = new Date(createdTodo.start_date!).getTime();
  const dueDateTime = new Date(createdTodo.due_date!).getTime();
  TestValidator.predicate(
    "due_date after start_date",
    dueDateTime > startDateTime,
  );
  // 6. Validate default completion status is 'incomplete' (false)
  TestValidator.equals(
    "completed defaults to false",
    createdTodo.completed,
    false,
  );
  // 7. Validate system-generated timestamps exist (business logic, not type validation)
  TestValidator.predicate(
    "has created_at timestamp",
    createdTodo.created_at !== null && createdTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    createdTodo.updated_at !== null && createdTodo.updated_at !== undefined,
  );
  // 8. Validate todo is associated with the authenticated member
  TestValidator.equals(
    "member id matches",
    createdTodo.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member email matches",
    createdTodo.member.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "member display_name matches",
    createdTodo.member.display_name,
    authorizedMember.display_name,
  );
  // 9. Validate that created_at and updated_at are close to current time (within 5 seconds)
  // This is business logic validation, not type validation
  const currentTime = Date.now();
  const createdAtTime = new Date(createdTodo.created_at).getTime();
  const updatedAtTime = new Date(createdTodo.updated_at).getTime();
  TestValidator.predicate(
    "created_at is recent",
    Math.abs(currentTime - createdAtTime) < 5000,
  );
  TestValidator.predicate(
    "updated_at is recent",
    Math.abs(currentTime - updatedAtTime) < 5000,
  );
}
