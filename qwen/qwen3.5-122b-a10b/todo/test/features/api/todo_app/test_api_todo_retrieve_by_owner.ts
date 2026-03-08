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
 * Test that an authenticated member can successfully retrieve their own active todo item.
 *
 * This test validates:
 * 1. Member authentication via join
 * 2. Todo creation with all fields (title, description, start date, due date)
 * 3. Todo retrieval by UUID
 * 4. Response contains complete todo entity with author summary
 * 5. Author field correctly references the authenticated member
 * 6. Soft delete timestamp is null (active status)
 * 7. updated_at field present for optimistic locking
 */
export async function test_api_todo_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create todo with all fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve todo by UUID
  const retrieved = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate response
  TestValidator.equals("todo ID matches", retrieved.id, todo.id);
  TestValidator.equals("title matches", retrieved.title, todo.title);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    todo.description,
  );
  TestValidator.equals(
    "start date matches",
    retrieved.start_date,
    todo.start_date,
  );
  TestValidator.equals("due date matches", retrieved.due_date, todo.due_date);
  TestValidator.predicate(
    "completed is boolean",
    typeof retrieved.completed === "boolean",
  );
  TestValidator.predicate("deleted_at is null", retrieved.deleted_at === null);
  TestValidator.predicate(
    "created_at exists",
    retrieved.created_at !== null && retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrieved.updated_at !== null && retrieved.updated_at !== undefined,
  );
  // 5. Validate author summary
  TestValidator.equals(
    "author ID matches member",
    retrieved.author.id,
    auth.id,
  );
  TestValidator.equals(
    "author display_name matches",
    retrieved.author.display_name,
    auth.displayName,
  );
  TestValidator.predicate(
    "author created_at exists",
    retrieved.author.created_at !== null &&
      retrieved.author.created_at !== undefined,
  );
  TestValidator.predicate(
    "author updated_at exists",
    retrieved.author.updated_at !== null &&
      retrieved.author.updated_at !== undefined,
  );
  TestValidator.predicate(
    "author deleted_at is null",
    retrieved.author.deleted_at === null,
  );
}
