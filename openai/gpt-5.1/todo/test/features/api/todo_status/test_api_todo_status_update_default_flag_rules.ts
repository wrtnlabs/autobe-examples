import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate updating Todo status default/active flags for a todoAdmin.
 *
 * Business context:
 *
 * - A todoAdmin manages a catalogue of Todo statuses in `todo_app_todo_statuses`.
 * - Each status has a stable `code`, user-facing label/description/group, display
 *   `sort_order`, and two behavior flags: `is_default` and `is_active`.
 * - The update endpoint identified by status `code` lets admins change
 *   user-facing metadata and these flags while keeping identifiers (id/code)
 *   and `created_at` immutable.
 *
 * This test covers the happy-path workflow of promoting a non-default status to
 * default and ensuring that identifiers and timestamps behave correctly for the
 * updated record.
 *
 * Steps:
 *
 * 1. Register a new todoAdmin account with /auth/todoAdmin/join.
 *
 *    - Rely on the SDK to attach Authorization header using returned token.
 * 2. As that admin, create two statuses via POST /todoApp/todoAdmin/todoStatuses:
 *
 *    - Status A: code="ACTIVE", is_default=true, is_active=true.
 *    - Status B: code="COMPLETED", is_default=false, is_active=true.
 * 3. Promote Status B to default using PUT
 *    /todoApp/todoAdmin/todoStatuses/{statusCode}:
 *
 *    - StatusCode="COMPLETED".
 *    - Body ITodoAppTodoStatus.IUpdate with new label/description/group and
 *         is_default=true.
 * 4. Validate the update response for Status B:
 *
 *    - Type-safe via typia.assert.
 *    - `id` remains unchanged compared to creation response.
 *    - `code` remains "COMPLETED" (immutable business identifier).
 *    - `label`, `description`, and `group` are updated to the new values.
 *    - `is_default` is true and `is_active` is still true.
 *    - `created_at` is unchanged and `updated_at` is the same or later than
 *         `created_at`.
 * 5. (Optional within same test) Deactivate Status B:
 *
 *    - Call PUT again for `statusCode="COMPLETED"` with body { is_active: false }.
 *    - Validate that:
 *
 *         - `id` and `code` remain unchanged.
 *         - `is_active` becomes false.
 *         - `updated_at` advances again relative to the prior update.
 */
export async function test_api_todo_status_update_default_flag_rules(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin and obtain authorized context
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create Status A (ACTIVE, default, active)
  const statusACreate = {
    code: "ACTIVE",
    label: `ACTIVE-${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const statusA: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusACreate,
    });
  typia.assert(statusA);

  TestValidator.equals(
    "status A code matches request",
    statusA.code,
    statusACreate.code,
  );
  TestValidator.equals(
    "status A is_default true as requested",
    statusA.is_default,
    true,
  );
  TestValidator.equals(
    "status A is_active true as requested",
    statusA.is_active,
    true,
  );

  // 3. Create Status B (COMPLETED, non-default, active)
  const statusBCreate = {
    code: "COMPLETED",
    label: `COMPLETED-${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 2,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const statusB: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBCreate,
    });
  typia.assert(statusB);

  TestValidator.equals(
    "status B code matches request",
    statusB.code,
    statusBCreate.code,
  );
  TestValidator.equals(
    "status B initially non-default",
    statusB.is_default,
    false,
  );
  TestValidator.equals("status B initially active", statusB.is_active, true);

  const originalBId = statusB.id;
  const originalBCreatedAt = statusB.created_at;
  const originalBUpdatedAt = statusB.updated_at;

  // 4. Promote Status B to default and update user-facing metadata
  const updatedLabel = `COMPLETED-UPDATED-${RandomGenerator.name(1)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedGroup = "core-updated";

  const statusBUpdateBody = {
    label: updatedLabel,
    description: updatedDescription,
    group: updatedGroup,
    // Test default promotion; keep is_active unchanged by omitting it
    is_default: true,
  } satisfies ITodoAppTodoStatus.IUpdate;

  const statusBPromoted: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.update(connection, {
      statusCode: statusB.code,
      body: statusBUpdateBody,
    });
  typia.assert(statusBPromoted);

  // 4-a. Validate identity immutability
  TestValidator.equals(
    "status B id is stable across update",
    statusBPromoted.id,
    originalBId,
  );
  TestValidator.equals(
    "status B code remains immutable",
    statusBPromoted.code,
    statusB.code,
  );

  // 4-b. Validate user-facing metadata changes
  TestValidator.equals(
    "status B label updated as requested",
    statusBPromoted.label,
    updatedLabel,
  );
  TestValidator.equals(
    "status B description updated as requested",
    statusBPromoted.description,
    updatedDescription,
  );
  TestValidator.equals(
    "status B group updated as requested",
    statusBPromoted.group,
    updatedGroup,
  );

  // 4-c. Validate flags
  TestValidator.equals(
    "status B promoted to default",
    statusBPromoted.is_default,
    true,
  );
  TestValidator.equals(
    "status B remains active after default promotion",
    statusBPromoted.is_active,
    true,
  );

  // 4-d. Validate timestamps: created_at unchanged, updated_at advanced or same-time
  TestValidator.equals(
    "status B created_at remains unchanged",
    statusBPromoted.created_at,
    originalBCreatedAt,
  );

  await TestValidator.predicate(
    "status B updated_at not before created_at",
    async () => {
      const created = new Date(originalBCreatedAt).getTime();
      const updated = new Date(statusBPromoted.updated_at).getTime();
      return updated >= created;
    },
  );

  await TestValidator.predicate(
    "status B updated_at advanced or stayed same compared to previous updated_at",
    async () => {
      const prev = new Date(originalBUpdatedAt).getTime();
      const next = new Date(statusBPromoted.updated_at).getTime();
      return next >= prev;
    },
  );

  // 5. Optional: deactivate Status B and validate local invariants
  const statusBDeactivateBody = {
    is_active: false,
  } satisfies ITodoAppTodoStatus.IUpdate;

  const statusBDeactivated: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.update(connection, {
      statusCode: statusB.code,
      body: statusBDeactivateBody,
    });
  typia.assert(statusBDeactivated);

  TestValidator.equals(
    "status B id remains stable after deactivation",
    statusBDeactivated.id,
    originalBId,
  );
  TestValidator.equals(
    "status B code remains immutable after deactivation",
    statusBDeactivated.code,
    statusB.code,
  );
  TestValidator.equals(
    "status B remains default after deactivation unless business rules change it",
    statusBDeactivated.is_default,
    statusBPromoted.is_default,
  );
  TestValidator.equals(
    "status B is_active becomes false after deactivation",
    statusBDeactivated.is_active,
    false,
  );

  await TestValidator.predicate(
    "status B updated_at advances again after deactivation",
    async () => {
      const prev = new Date(statusBPromoted.updated_at).getTime();
      const next = new Date(statusBDeactivated.updated_at).getTime();
      return next >= prev;
    },
  );
}
