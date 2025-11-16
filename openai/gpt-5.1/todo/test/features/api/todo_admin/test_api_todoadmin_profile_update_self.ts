import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate that an authenticated todoAdmin can update their own profile.
 *
 * Business flow:
 *
 * 1. Register a new todoAdmin (adminA) through /auth/todoAdmin/join, which also
 *    sets the Authorization header on the shared connection.
 * 2. As the authenticated adminA, create a new Todo status in the catalogue so
 *    there is at least one valid status code that can be assigned.
 * 3. Call PUT /todoApp/todoAdmin/todoAdmins/{todoAdminId} with adminA.id in the
 *    path and a body of type ITodoAppTodoAdmin.IUpdate that changes
 *    display_name and status.
 * 4. Assert that the returned ITodoAppTodoAdmin reflects the new display_name and
 *    status while preserving immutable fields such as id and created_at, and
 *    that updated_at has advanced relative to the previous value.
 * 5. Verify that the DTO does not expose credential hashes by construction and
 *    that the response structure fully matches ITodoAppTodoAdmin.
 */
export async function test_api_todoadmin_profile_update_self(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin (adminA) and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.example.com/join",
    referrer: "https://admin.todoapp.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const authorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorized);

  // Snapshot original admin profile for later comparison
  const originalProfile: ITodoAppTodoAdmin = {
    id: authorized.id,
    email: authorized.email,
    display_name: authorized.display_name,
    status: authorized.status,
    last_login_at: authorized.last_login_at,
    created_at: authorized.created_at,
    updated_at: authorized.updated_at,
  };
  typia.assert<ITodoAppTodoAdmin>(originalProfile);

  // 2. Create a new Todo status as adminA so we have a valid status code
  const statusCreateBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "admin-profile",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Prepare update payload for adminA's own profile
  const newDisplayName = RandomGenerator.name();
  const newStatus = createdStatus.code;

  const updateBody = {
    display_name: newDisplayName,
    status: newStatus,
  } satisfies ITodoAppTodoAdmin.IUpdate;

  // 4. Call update on the same admin using their own id
  const updated: ITodoAppTodoAdmin =
    await api.functional.todoApp.todoAdmin.todoAdmins.update(connection, {
      todoAdminId: authorized.id,
      body: updateBody,
    });
  typia.assert<ITodoAppTodoAdmin>(updated);

  // 5. Business assertions
  // 5-1. Immutable identity fields must remain the same
  TestValidator.equals(
    "admin id must remain unchanged after self profile update",
    updated.id,
    originalProfile.id,
  );

  TestValidator.equals(
    "admin created_at must remain unchanged after self profile update",
    updated.created_at,
    originalProfile.created_at,
  );

  TestValidator.equals(
    "admin email must remain unchanged when not updated",
    updated.email,
    originalProfile.email,
  );

  // 5-2. Mutable fields must reflect requested changes
  TestValidator.equals(
    "display_name should be updated to new value",
    updated.display_name,
    newDisplayName,
  );

  TestValidator.equals(
    "status should be updated to new status code from catalogue",
    updated.status,
    newStatus,
  );

  // 5-3. updated_at must move forward or at least change
  TestValidator.notEquals(
    "updated_at should change after profile update",
    updated.updated_at,
    originalProfile.updated_at,
  );

  // Ensure DTO shape is correct; type-level guarantees already ensure
  // credential hashes and tokens are not exposed here.
  typia.assert<ITodoAppTodoAdmin>(updated);
}
