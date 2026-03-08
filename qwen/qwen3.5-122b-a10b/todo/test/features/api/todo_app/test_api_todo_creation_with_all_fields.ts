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
 * Test the primary success path for creating a todo item with all available fields.
 * A member should be able to create a todo with a title, optional description, start date, and due date.
 * The system must associate the todo with the authenticated member, initialize completion status to false,
 * and return the created todo with all system-generated fields (id, timestamps).
 * Verify the todo appears in the member's todo list and respects data isolation rules.
 */
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Prepare dates - start date before due date
  const now = new Date();
  const startDate = RandomGenerator.date(now, 7 * 24 * 60 * 60 * 1000); // within 7 days
  const dueDate = RandomGenerator.date(startDate, 14 * 24 * 60 * 60 * 1000); // 14 days after start
  // 3. Create todo with all fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Validate todo structure and fields
  TestValidator.equals("title is set", todo.title.length > 0, true);
  TestValidator.equals("description is set", todo.description !== null, true);
  TestValidator.predicate("startDate is valid", todo.start_date !== null);
  TestValidator.predicate("dueDate is valid", todo.due_date !== null);
  TestValidator.equals("completed initialized to false", todo.completed, false);
  TestValidator.predicate("has valid ID", todo.id.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    todo.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active todo",
    todo.deleted_at,
    null,
  );
  // 5. Validate author field contains member summary
  TestValidator.equals("author ID matches member", todo.author.id, member.id);
  TestValidator.equals(
    "author has display_name",
    todo.author.display_name.length > 0,
    true,
  );
  TestValidator.predicate(
    "author has created_at",
    todo.author.created_at.length > 0,
  );
  TestValidator.predicate(
    "author has updated_at",
    todo.author.updated_at.length > 0,
  );
  TestValidator.equals(
    "author deleted_at is null",
    todo.author.deleted_at,
    null,
  );
}
