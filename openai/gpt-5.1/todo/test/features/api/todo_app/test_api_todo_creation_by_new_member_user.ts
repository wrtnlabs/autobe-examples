import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Verify that a newly registered member user can create a basic pending todo
 * with minimal required fields.
 *
 * Business workflow:
 *
 * 1. Register a brand-new member user via POST /auth/memberUser/join using
 *    ITodoAppMemberUserJoin.IRequest. This returns
 *    ITodoAppMemberuser.IAuthorized and also configures the Authorization
 *    header for the provided connection.
 * 2. With this authenticated member user context, call POST
 *    /todoApp/memberUser/todos using ITodoAppTodo.ICreate that only specifies a
 *    non-empty, trimmed title (no description field) to validate minimal
 *    creation semantics.
 * 3. Assert that the response is a full ITodoAppTodo object and validate key
 *    business invariants:
 *
 *    - Id is a server-generated UUID.
 *    - MemberUser.id and memberUser.email match the joined member user.
 *    - Status is initialized to "pending".
 *    - Created_at and updated_at are identical on initial creation.
 *    - Completed_at and deleted_at are null/undefined.
 * 4. We skip any follow-up GET by id because such endpoint is not provided in the
 *    current SDK. Instead, we focus on validating the single create operation
 *    and the returned payload.
 */
export async function test_api_todo_creation_by_new_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user using realistic random data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    // ip is optional; omit to let server derive it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic sanity checks on authorized context
  TestValidator.predicate(
    "authorized member user id is UUID",
    () => typeof authorized.id === "string" && authorized.id.length > 0,
  );

  // 2. Create a todo with minimal required fields (title only)
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  }).trim();

  const createBody = {
    title,
    // description intentionally omitted to rely on optional semantics
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(todo);

  // 3. Business validations on the newly created todo

  // Ownership should be derived from the authenticated member user
  TestValidator.equals(
    "todo.memberUser.id should match authorized member id",
    todo.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "todo.memberUser.email should match authorized member email",
    todo.memberUser.email,
    authorized.email,
  );

  // Title should be preserved as provided
  TestValidator.equals(
    "todo.title should equal requested title",
    todo.title,
    title,
  );

  // Description should be null or undefined when omitted on create
  TestValidator.predicate(
    "todo.description should be null or undefined when omitted",
    () => todo.description === null || todo.description === undefined,
  );

  // Status should be initialized to the business default of "pending"
  TestValidator.equals(
    "todo.status should be initialized to 'pending'",
    todo.status,
    "pending",
  );

  // created_at and updated_at should be equal on first creation
  TestValidator.equals(
    "created_at and updated_at should match on initial creation",
    todo.created_at,
    todo.updated_at,
  );

  // completed_at and deleted_at should be null/undefined for a fresh todo
  TestValidator.predicate(
    "todo.completed_at should be null or undefined on creation",
    () => todo.completed_at === null || todo.completed_at === undefined,
  );
  TestValidator.predicate(
    "todo.deleted_at should be null or undefined on creation",
    () => todo.deleted_at === null || todo.deleted_at === undefined,
  );
}
