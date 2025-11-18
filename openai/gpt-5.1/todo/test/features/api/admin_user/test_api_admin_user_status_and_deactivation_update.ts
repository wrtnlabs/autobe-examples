import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate lifecycle status and logical deletion/reactivation updates for an
 * administrative user account.
 *
 * This test covers a realistic admin-user lifecycle scenario:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join, which both creates
 *    the todo_app_adminusers row and authenticates the actor, returning
 *    ITodoAppAdminUser.IAuthorized plus setting the connection Authorization
 *    header.
 * 2. As that authenticated admin, update the same adminUser record via PUT
 *    /todoApp/adminUser/adminUsers/{adminUserId}, using an
 *    ITodoAppAdminUser.IUpdate body to set a non-active status and populate
 *    deleted_at with a timestamp string, simulating logical deactivation.
 * 3. Assert that the response ITodoAppAdminUser preserves immutable identity
 *    fields (id, created_at) and email, while reflecting the updated status,
 *    deleted_at, and a refreshed updated_at.
 * 4. Then perform a follow-up update that sets status back to an active-like value
 *    and explicitly nulls deleted_at, simulating reactivation of a logically
 *    deleted account. Assert that this transition succeeds and fields match
 *    expectations.
 * 5. Confirm that unrelated fields not included in the update bodies, such as
 *    email and possibly display_name when omitted, remain unchanged across the
 *    lifecycle transitions.
 */
export async function test_api_admin_user_status_and_deactivation_update(
  connection: api.IConnection,
) {
  // 1. Join/register an adminUser and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  // Capture original immutable and baseline fields for later comparison
  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  const originalDeletedAt = authorized.deleted_at ?? null;
  const originalStatus = authorized.status;

  // 2. Deactivate: set status to a non-active value and set deleted_at
  const deactivatedStatus = "disabled";
  const deletedAtTimestamp = new Date().toISOString();

  const deactivateBody = {
    status: deactivatedStatus,
    deleted_at: deletedAtTimestamp,
  } satisfies ITodoAppAdminUser.IUpdate;

  const deactivated = await api.functional.todoApp.adminUser.adminUsers.update(
    connection,
    {
      adminUserId: originalId,
      body: deactivateBody,
    },
  );
  typia.assert<ITodoAppAdminUser>(deactivated);

  // Business assertions after deactivation
  TestValidator.equals(
    "id must remain the same after deactivation",
    deactivated.id,
    originalId,
  );
  TestValidator.equals(
    "created_at must remain unchanged after deactivation",
    deactivated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "email must remain unchanged after deactivation",
    deactivated.email,
    originalEmail,
  );
  TestValidator.equals(
    "status must be updated to deactivated value",
    deactivated.status,
    deactivatedStatus,
  );
  TestValidator.equals(
    "deleted_at must be set to requested timestamp",
    deactivated.deleted_at ?? null,
    deletedAtTimestamp,
  );
  TestValidator.predicate(
    "updated_at must change when deactivating",
    deactivated.updated_at !== originalUpdatedAt,
  );

  // 3. Reactivate: set status back to an active-like value and clear deleted_at
  const reactivatedStatus = "active";

  const reactivateBody = {
    status: reactivatedStatus,
    deleted_at: null,
  } satisfies ITodoAppAdminUser.IUpdate;

  const reactivated = await api.functional.todoApp.adminUser.adminUsers.update(
    connection,
    {
      adminUserId: originalId,
      body: reactivateBody,
    },
  );
  typia.assert<ITodoAppAdminUser>(reactivated);

  // Business assertions after reactivation
  TestValidator.equals(
    "id must remain the same after reactivation",
    reactivated.id,
    originalId,
  );
  TestValidator.equals(
    "created_at must remain unchanged after reactivation",
    reactivated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "email must remain unchanged after reactivation",
    reactivated.email,
    originalEmail,
  );
  TestValidator.equals(
    "status must be updated to active value",
    reactivated.status,
    reactivatedStatus,
  );
  TestValidator.equals(
    "deleted_at must be cleared (null) after reactivation",
    reactivated.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "updated_at must change again when reactivating",
    reactivated.updated_at !== deactivated.updated_at,
  );

  // Sanity check: original deleted_at should have been null or unchanged prior to our first update
  TestValidator.equals(
    "original deleted_at should be null before lifecycle updates",
    originalDeletedAt,
    null,
  );
}
