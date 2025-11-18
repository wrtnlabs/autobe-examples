import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that an authenticated member user can delete their own todo.
 *
 * Business context:
 *
 * - A member user registers via the authentication join endpoint and receives an
 *   authorized context with tokens automatically applied to the shared
 *   connection.
 * - Using this authenticated context, the member user creates a todo entry.
 * - The same member user then deletes that todo using the DELETE todo endpoint.
 *
 * What this test validates:
 *
 * 1. A fresh member user can be registered and authenticated using
 *    /auth/memberUser/join.
 * 2. The authenticated member user can create a todo using POST
 *    /todoApp/memberUser/todos with a valid ITodoAppTodo.ICreate body.
 * 3. The same member user can delete that todo using DELETE
 *    /todoApp/memberUser/todos/{todoId}.
 * 4. The erase operation returns a valid ITodoAppTodo and reflects deletion
 *    semantics, specifically:
 *
 *    - The id, title, description, and owner remain consistent.
 *    - Deleted_at becomes non-null, indicating logical deletion.
 *    - Updated_at changes compared to the pre-delete updated_at timestamp.
 *
 * Limitations:
 *
 * - No list/detail todo endpoints are provided, so post-deletion visibility
 *   checks are limited to the erase response object itself.
 */
export async function test_api_todo_delete_by_owner_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to establish authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    // IP is optional; omit it to let server derive it if needed.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorizedMember: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a new todo for this member user.
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // Basic invariants after creation.
  TestValidator.equals(
    "created todo is owned by the joined member user",
    createdTodo.memberUser.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "created todo title matches request",
    createdTodo.title,
    createBody.title,
  );
  TestValidator.equals(
    "created todo description matches request",
    createdTodo.description ?? null,
    createBody.description ?? null,
  );

  const preDeleteUpdatedAt: string & tags.Format<"date-time"> =
    createdTodo.updated_at;

  // 3. Delete the created todo using its id.
  const erasedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(erasedTodo);

  // 4. Validate deletion semantics and invariants.
  // - Core identifiers and content should remain the same.
  TestValidator.equals(
    "erased todo id matches created todo id",
    erasedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "erased todo title remains unchanged",
    erasedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "erased todo description remains unchanged",
    erasedTodo.description ?? null,
    createdTodo.description ?? null,
  );
  TestValidator.equals(
    "erased todo owner remains the same member user",
    erasedTodo.memberUser.id,
    createdTodo.memberUser.id,
  );

  // - deleted_at should be non-null, indicating logical deletion.
  TestValidator.predicate(
    "erased todo has non-null deleted_at after deletion",
    erasedTodo.deleted_at !== null && erasedTodo.deleted_at !== undefined,
  );

  // - updated_at should be changed compared to pre-delete value.
  TestValidator.predicate(
    "erased todo updated_at has changed after deletion",
    erasedTodo.updated_at !== preDeleteUpdatedAt,
  );
}
