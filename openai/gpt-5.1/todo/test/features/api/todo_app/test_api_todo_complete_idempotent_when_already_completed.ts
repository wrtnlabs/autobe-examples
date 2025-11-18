import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Verify idempotent completion of a todo item for a member user.
 *
 * Business purpose:
 *
 * - Ensure that clients can safely retry the `complete` operation for a todo
 *   without risk of errors or inconsistent lifecycle state.
 * - Confirm that once a todo has been completed, additional completion calls do
 *   not change its business status or completion timestamp, while maintaining
 *   coherent audit timestamps.
 *
 * Test steps:
 *
 * 1. Register a new member user via auth.memberUser.join and obtain the authorized
 *    context (token is auto-bound to `connection`).
 * 2. Create a new todo via todoApp.memberUser.todos.create and capture the initial
 *    ITodoAppTodo as `created`.
 * 3. Complete the todo once via todoApp.memberUser.todos.complete using the
 *    created todo's id, capturing `firstCompleted`.
 * 4. Immediately call the same complete endpoint again with the same todo id,
 *    capturing `secondCompleted`.
 * 5. Assert idempotency and lifecycle invariants between `created`,
 *    `firstCompleted`, and `secondCompleted`.
 *
 * Assertions:
 *
 * - All API responses conform to their DTO types (enforced via typia.assert).
 * - `created.id === firstCompleted.id === secondCompleted.id`.
 * - `firstCompleted.status === secondCompleted.status`.
 * - `created.status` differs from `firstCompleted.status` (the initial create
 *   should represent an uncompleted state while completion represents completed
 *   state; we only assert inequality, not concrete values, since allowed status
 *   strings are not enumerated in the schema).
 * - `firstCompleted.completed_at` is non-null.
 * - `secondCompleted.completed_at` is exactly equal to
 *   `firstCompleted.completed_at` (strong idempotency on completion
 *   timestamp).
 * - `created.completed_at` is null or undefined (no completion at initial
 *   creation; we allow null/undefined due to DTO definition).
 * - `firstCompleted.updated_at` is >= `created.updated_at`.
 * - `secondCompleted.updated_at` is >= `firstCompleted.updated_at`.
 * - `firstCompleted.deleted_at === secondCompleted.deleted_at` (no accidental
 *   deletion side effect).
 * - `firstCompleted.memberUser.id === secondCompleted.memberUser.id` and both
 *   match the authorized user id from join.
 */
export async function test_api_todo_complete_idempotent_when_already_completed(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.example.com/join", // valid URI-like string
    referrer: "https://todoapp.example.com/landing", // valid URI-like string
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create a new todo for this member user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(created);

  // Basic sanity: ownership and initial lifecycle
  TestValidator.equals(
    "todo is owned by the joined member user",
    created.memberUser.id,
    authorized.id,
  );

  // Note: DTO does not enumerate status values, so we only ensure basic
  // lifecycle transitions and completed_at behavior, not concrete strings.

  // 3. Complete the todo once
  const firstCompleted: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(firstCompleted);

  // 4. Immediately complete again (idempotent retry)
  const secondCompleted: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(secondCompleted);

  // 5. Idempotency and lifecycle assertions

  // Identity invariants
  TestValidator.equals(
    "todo id is stable across lifecycle",
    firstCompleted.id,
    created.id,
  );
  TestValidator.equals(
    "todo id is stable across repeated completion",
    secondCompleted.id,
    created.id,
  );

  // Ownership invariants
  TestValidator.equals(
    "owner id remains the same after first completion",
    firstCompleted.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "owner id remains the same after second completion",
    secondCompleted.memberUser.id,
    authorized.id,
  );

  // Status behavior
  TestValidator.notEquals(
    "status changes between creation and first completion",
    firstCompleted.status,
    created.status,
  );
  TestValidator.equals(
    "status remains stable between first and second completion",
    secondCompleted.status,
    firstCompleted.status,
  );

  // completed_at behavior
  TestValidator.predicate(
    "created todo has not yet been completed",
    created.completed_at === null || created.completed_at === undefined,
  );
  TestValidator.predicate(
    "first completion sets completed_at",
    firstCompleted.completed_at !== null &&
      firstCompleted.completed_at !== undefined,
  );
  TestValidator.equals(
    "completed_at is stable across repeated completion",
    secondCompleted.completed_at ?? null,
    firstCompleted.completed_at ?? null,
  );

  // updated_at monotonicity
  TestValidator.predicate(
    "first completion updated_at is >= created updated_at",
    firstCompleted.updated_at >= created.updated_at,
  );
  TestValidator.predicate(
    "second completion updated_at is >= first completion updated_at",
    secondCompleted.updated_at >= firstCompleted.updated_at,
  );

  // created_at stability
  TestValidator.equals(
    "created_at is stable after first completion",
    firstCompleted.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "created_at is stable after second completion",
    secondCompleted.created_at,
    created.created_at,
  );

  // deleted_at stability
  TestValidator.equals(
    "deleted_at remains unchanged between first and second completion",
    secondCompleted.deleted_at ?? null,
    firstCompleted.deleted_at ?? null,
  );
}
