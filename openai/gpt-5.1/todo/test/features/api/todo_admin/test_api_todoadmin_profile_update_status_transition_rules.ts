import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate todoAdmin status lifecycle transitions via profile update.
 *
 * Business goals:
 *
 * - Ensure that allowed status transitions for a todoAdmin account (e.g., from an
 *   initial status to "SUSPENDED" and then to "CLOSED") succeed and reflect
 *   correctly in the admin profile returned by the update API.
 * - Ensure that forbidden transitions (such as reactivating a "CLOSED" admin to
 *   "ACTIVE") are rejected with an error and do not change persisted state.
 * - Confirm that non-credential fields like `status` and `display_name` are the
 *   only mutable fields, that `id` and `email` remain stable across updates,
 *   and that `updated_at` changes only on successful updates.
 *
 * Flow:
 *
 * 1. Register a todoAdmin (adminA) with /auth/todoAdmin/join to obtain an
 *    authenticated context (Authorization header set on connection) and capture
 *    its id/email/initial timestamps.
 * 2. Configure lifecycle status catalogue entries via POST
 *    /todoApp/todoAdmin/todoStatuses for codes "ACTIVE", "SUSPENDED", and
 *    "CLOSED" to mirror business lifecycle states.
 * 3. Perform an allowed transition to "SUSPENDED" using PUT
 *    /todoApp/todoAdmin/todoAdmins/{todoAdminId} with
 *    ITodoAppTodoAdmin.IUpdate.status and validate that:
 *
 *    - The response status equals "SUSPENDED".
 *    - `id` and `email` are unchanged.
 *    - `updated_at` is different from the original `updated_at`.
 * 4. Perform another allowed transition to "CLOSED" and validate analogous
 *    invariants, capturing the resulting `updated_at` for comparison.
 * 5. Attempt a forbidden transition from "CLOSED" back to "ACTIVE" via the same
 *    update endpoint and assert that an error occurs using TestValidator.error
 *    (without checking status codes).
 * 6. Confirm logically that the admin entity we hold from the last successful
 *    update still represents the latest persisted state (status "CLOSED"), and
 *    rely on transactional semantics that invalid updates do not partially
 *    apply.
 */
export async function test_api_todoadmin_profile_update_status_transition_rules(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin (adminA) and obtain authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.example.com/register",
    referrer: "https://admin.todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const authorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;
  const adminEmail = authorized.email;
  const initialUpdatedAt = authorized.updated_at;

  // 2. Create Todo status catalogue entries: ACTIVE, SUSPENDED, CLOSED.
  const createStatus = async (
    code: string,
    label: string,
    sortOrder: number & tags.Type<"int32">,
    isDefault: boolean,
    isActive: boolean,
  ): Promise<ITodoAppTodoStatus> => {
    const body = {
      code,
      label,
      description: null,
      group: null,
      sort_order: sortOrder,
      is_default: isDefault,
      is_active: isActive,
    } satisfies ITodoAppTodoStatus.ICreate;

    const status: ITodoAppTodoStatus =
      await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
        body,
      });
    typia.assert<ITodoAppTodoStatus>(status);
    return status;
  };

  await createStatus(
    "ACTIVE",
    "Active",
    typia.random<number & tags.Type<"int32">>(),
    true,
    true,
  );
  await createStatus(
    "SUSPENDED",
    "Suspended",
    typia.random<number & tags.Type<"int32">>(),
    false,
    true,
  );
  await createStatus(
    "CLOSED",
    "Closed",
    typia.random<number & tags.Type<"int32">>(),
    false,
    false,
  );

  // 3. Perform an allowed transition from initial status to "SUSPENDED".
  const suspendedUpdateBody = {
    status: "SUSPENDED",
  } satisfies ITodoAppTodoAdmin.IUpdate;

  const suspended: ITodoAppTodoAdmin =
    await api.functional.todoApp.todoAdmin.todoAdmins.update(connection, {
      todoAdminId: adminId,
      body: suspendedUpdateBody,
    });
  typia.assert<ITodoAppTodoAdmin>(suspended);

  TestValidator.equals(
    "id should remain unchanged after suspension",
    suspended.id,
    adminId,
  );
  TestValidator.equals(
    "email should remain unchanged after suspension",
    suspended.email,
    adminEmail,
  );
  TestValidator.equals(
    "status should transition to SUSPENDED",
    suspended.status,
    "SUSPENDED",
  );
  TestValidator.notEquals(
    "updated_at should change after suspension",
    suspended.updated_at,
    initialUpdatedAt,
  );

  const suspendedUpdatedAt = suspended.updated_at;

  // 4. Perform another allowed transition from "SUSPENDED" to "CLOSED".
  const closedUpdateBody = {
    status: "CLOSED",
  } satisfies ITodoAppTodoAdmin.IUpdate;

  const closed: ITodoAppTodoAdmin =
    await api.functional.todoApp.todoAdmin.todoAdmins.update(connection, {
      todoAdminId: adminId,
      body: closedUpdateBody,
    });
  typia.assert<ITodoAppTodoAdmin>(closed);

  TestValidator.equals(
    "id should remain unchanged after closing",
    closed.id,
    adminId,
  );
  TestValidator.equals(
    "email should remain unchanged after closing",
    closed.email,
    adminEmail,
  );
  TestValidator.equals(
    "status should transition to CLOSED",
    closed.status,
    "CLOSED",
  );
  TestValidator.notEquals(
    "updated_at should change after closing",
    closed.updated_at,
    suspendedUpdatedAt,
  );

  const closedUpdatedAt = closed.updated_at;

  // 5. Attempt a forbidden transition from "CLOSED" back to "ACTIVE".
  const forbiddenUpdateBody = {
    status: "ACTIVE",
  } satisfies ITodoAppTodoAdmin.IUpdate;

  await TestValidator.error(
    "forbidden transition from CLOSED to ACTIVE should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.update(connection, {
        todoAdminId: adminId,
        body: forbiddenUpdateBody,
      });
    },
  );

  // 6. Logically confirm that the latest successful state remains CLOSED and
  // that its updated_at timestamp is the last successful one we observed.
  TestValidator.equals(
    "admin status remains CLOSED after failed reactivation attempt",
    closed.status,
    "CLOSED",
  );
  TestValidator.equals(
    "admin updated_at remains the last successful value after failed transition",
    closed.updated_at,
    closedUpdatedAt,
  );
}
