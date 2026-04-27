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
 * Test creating a new todo with the required title and all optional fields.
 *
 * Validates that a newly registered member can create a todo with a title, description, start date, and due date. Verifies that all submitted field values are correctly reflected in the response, that the todo is created in an incomplete and active state (completed_at and deleted_at are null), that the todo is properly associated with the authenticated member, and that the due date business rule (due_date after start_date) is satisfied.
 *
 * 1. Register a new member account via `authorize_member_join`.
 * 2. Create a todo with explicit title, description, start_date, and due_date values via `generate_random_todo_app_member_todos_create`.
 * 3. Validate that the response contains all submitted field values correctly.
 * 4. Validate that completed_at is null (todo starts incomplete).
 * 5. Validate that deleted_at is null (todo starts active, not trashed).
 * 6. Validate the todo is associated with the authenticated member.
 * 7. Validate that due_date is after start_date (business rule).
 */
export async function test_api_todo_creation_all_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Register a new member account
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  //----
  // 2. Create a todo with all optional fields
  //----
  const startDate = "2026-05-01T00:00:00.000Z" satisfies string as string;
  const dueDate = "2026-05-15T00:00:00.000Z" satisfies string as string;
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Plan vacation",
        description: "Research destinations, book flights, reserve hotels",
        start_date: startDate,
        due_date: dueDate,
      },
    },
  );
  typia.assert(todo);
  //----
  // 3. Validate submitted field values
  //----
  TestValidator.equals("title", todo.title, "Plan vacation");
  TestValidator.equals(
    "description",
    todo.description,
    "Research destinations, book flights, reserve hotels",
  );
  TestValidator.equals(
    "start_date",
    todo.start_date,
    "2026-05-01T00:00:00.000Z",
  );
  TestValidator.equals("due_date", todo.due_date, "2026-05-15T00:00:00.000Z");
  //----
  // 4. Validate todo is incomplete and active
  //----
  TestValidator.predicate(
    "completed_at is null for incomplete todo",
    todo.completed_at === null,
  );
  TestValidator.predicate(
    "deleted_at is null for active todo",
    todo.deleted_at === null,
  );
  //----
  // 5. Validate association with authenticated member
  //----
  TestValidator.equals(
    "todo member id matches authenticated member",
    todo.member.id,
    authorized.id,
  );
  //----
  // 6. Validate due_date is after start_date
  //----
  typia.assertGuard(todo.start_date!);
  typia.assertGuard(todo.due_date!);
  TestValidator.predicate(
    "due_date is after start_date",
    new Date(todo.due_date).getTime() > new Date(todo.start_date).getTime(),
  );
}
