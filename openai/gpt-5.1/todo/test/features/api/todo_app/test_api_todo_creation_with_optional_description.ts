import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that an authenticated member user can create a todo with an optional
 * description and that lifecycle defaults are applied correctly.
 *
 * Business goals:
 *
 * - Joining a member user establishes authenticated context through
 *   api.functional.auth.memberUser.join.
 * - Creating a todo via api.functional.todoApp.memberUser.todos.create correctly
 *   associates it with the authenticated member user.
 * - Optional description is accepted and persisted when provided.
 * - Lifecycle fields (status, created_at, updated_at, completed_at, deleted_at)
 *   follow the expected defaults for a new todo.
 *
 * Test workflow:
 *
 * 1. Register a new member user using POST /auth/memberUser/join with
 *    ITodoAppMemberUserJoin.IRequest. The SDK will set the Authorization header
 *    on the provided connection using the returned token.
 * 2. Build a todo creation request body with both title and a non-empty
 *    description and call POST /todoApp/memberUser/todos with
 *    ITodoAppTodo.ICreate.
 * 3. Assert that the response is a valid ITodoAppTodo and that the title and
 *    description exactly match the request body values.
 * 4. Validate lifecycle semantics:
 *
 *    - Status is a non-empty string (treat concrete value as an implementation
 *         detail but do check it is truthy).
 *    - Created_at and updated_at are valid ISO date-time strings and updated_at is
 *         not earlier than created_at.
 *    - Completed_at and deleted_at are null.
 * 5. As an additional variation, create a second todo without supplying
 *    description to confirm that omitting the optional field still results in a
 *    valid todo with lifecycle defaults and a null/undefined description.
 */
export async function test_api_todo_creation_with_optional_description(
  connection: api.IConnection,
) {
  // 1. Register a new member user, which also sets Authorization header
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a todo with non-empty description
  const titleWithDescription = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const description = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const createBodyWithDescription = {
    title: titleWithDescription,
    description,
  } satisfies ITodoAppTodo.ICreate;

  const todoWithDescription: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBodyWithDescription,
    });
  typia.assert(todoWithDescription);

  // 3. Validate basic field echoing for title and description
  TestValidator.equals(
    "todo with description: title should match request body",
    todoWithDescription.title,
    createBodyWithDescription.title,
  );
  TestValidator.equals(
    "todo with description: description should match request body",
    todoWithDescription.description,
    createBodyWithDescription.description,
  );

  // 4. Validate lifecycle fields for first todo
  TestValidator.predicate(
    "todo with description: status must be a non-empty string",
    typeof todoWithDescription.status === "string" &&
      todoWithDescription.status.trim().length > 0,
  );

  // created_at and updated_at are ISO date-time strings; ensure updated_at >= created_at
  const createdAtFirst = new Date(todoWithDescription.created_at).getTime();
  const updatedAtFirst = new Date(todoWithDescription.updated_at).getTime();

  TestValidator.predicate(
    "todo with description: created_at must be a valid date",
    !Number.isNaN(createdAtFirst),
  );
  TestValidator.predicate(
    "todo with description: updated_at must be a valid date",
    !Number.isNaN(updatedAtFirst),
  );
  TestValidator.predicate(
    "todo with description: updated_at should not be earlier than created_at",
    updatedAtFirst >= createdAtFirst,
  );

  TestValidator.equals(
    "todo with description: completed_at should be null when newly created",
    todoWithDescription.completed_at ?? null,
    null,
  );
  TestValidator.equals(
    "todo with description: deleted_at should be null when newly created",
    todoWithDescription.deleted_at ?? null,
    null,
  );

  // 5. Create a second todo without description to validate optional handling
  const titleWithoutDescription = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });

  const createBodyWithoutDescription = {
    title: titleWithoutDescription,
  } satisfies ITodoAppTodo.ICreate;

  const todoWithoutDescription: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBodyWithoutDescription,
    });
  typia.assert(todoWithoutDescription);

  // Validate title echo and that description is null/undefined
  TestValidator.equals(
    "todo without description: title should match request body",
    todoWithoutDescription.title,
    createBodyWithoutDescription.title,
  );
  TestValidator.equals(
    "todo without description: description should be null when omitted in request",
    todoWithoutDescription.description ?? null,
    null,
  );

  // Lifecycle checks for second todo
  TestValidator.predicate(
    "todo without description: status must be a non-empty string",
    typeof todoWithoutDescription.status === "string" &&
      todoWithoutDescription.status.trim().length > 0,
  );

  const createdAtSecond = new Date(todoWithoutDescription.created_at).getTime();
  const updatedAtSecond = new Date(todoWithoutDescription.updated_at).getTime();

  TestValidator.predicate(
    "todo without description: created_at must be a valid date",
    !Number.isNaN(createdAtSecond),
  );
  TestValidator.predicate(
    "todo without description: updated_at must be a valid date",
    !Number.isNaN(updatedAtSecond),
  );
  TestValidator.predicate(
    "todo without description: updated_at should not be earlier than created_at",
    updatedAtSecond >= createdAtSecond,
  );

  TestValidator.equals(
    "todo without description: completed_at should be null when newly created",
    todoWithoutDescription.completed_at ?? null,
    null,
  );
  TestValidator.equals(
    "todo without description: deleted_at should be null when newly created",
    todoWithoutDescription.deleted_at ?? null,
    null,
  );
}
