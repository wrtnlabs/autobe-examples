import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate updating email and display_name of an existing administrative user
 * via the adminUser update endpoint.
 *
 * Business scenario:
 *
 * - An admin joins the system, obtaining an authorized adminUser context and
 *   token via POST /auth/adminUser/join.
 * - The same admin then updates their own profile fields (email and display_name)
 *   using PUT /todoApp/adminUser/adminUsers/{adminUserId}.
 * - The update must change only the specified fields while preserving other
 *   properties such as id, created_at, status, failed_login_count,
 *   last_login_at, and deleted_at.
 *
 * Steps:
 *
 * 1. Join as a new adminUser (this both creates the admin record and sets
 *    Authorization header on the connection).
 * 2. Record baseline fields from the authorized payload.
 * 3. Prepare an ITodoAppAdminUser.IUpdate body that changes email and display_name
 *    only.
 * 4. Call the update endpoint with the adminUserId from the authorized user.
 * 5. Validate that the returned ITodoAppAdminUser reflects the updated email and
 *    display_name while preserving id, created_at, status, failed_login_count,
 *    last_login_at, and deleted_at.
 * 6. Validate that updated_at is not earlier than the previous updated_at and is
 *    at or after created_at.
 */
export async function test_api_admin_user_update_profile_fields(
  connection: api.IConnection,
) {
  // 1. Join as a new admin user to obtain an authorized context
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinInput,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  // 2. Capture baseline fields from the authorized admin user
  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalDisplayName = authorized.display_name ?? null;
  const originalStatus = authorized.status;
  const originalFailedLoginCount = authorized.failed_login_count;
  const originalLastLoginAt = authorized.last_login_at ?? null;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  const originalDeletedAt = authorized.deleted_at ?? null;

  // 3. Prepare update body changing only email and display_name
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newDisplayName = RandomGenerator.name();

  // Ensure the new email is different from the original to make assertion meaningful
  const finalEmail =
    newEmail === originalEmail
      ? typia.random<string & tags.Format<"email">>()
      : newEmail;

  const updateBody = {
    email: finalEmail,
    display_name: newDisplayName,
  } satisfies ITodoAppAdminUser.IUpdate;

  // 4. Perform the update call as the same authenticated admin
  const updated: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: originalId,
      body: updateBody,
    });
  typia.assert<ITodoAppAdminUser>(updated);

  // 5. Validate updated fields and preserved fields
  TestValidator.equals(
    "admin id should remain unchanged",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "email should be updated to new value",
    updated.email,
    finalEmail,
  );

  TestValidator.equals(
    "display_name should be updated to new non-null value",
    updated.display_name ?? null,
    newDisplayName,
  );

  TestValidator.equals(
    "status should remain unchanged when not provided in update",
    updated.status,
    originalStatus,
  );

  TestValidator.equals(
    "failed_login_count should remain unchanged when not provided in update",
    updated.failed_login_count,
    originalFailedLoginCount,
  );

  TestValidator.equals(
    "last_login_at should remain unchanged when not provided in update",
    updated.last_login_at ?? null,
    originalLastLoginAt,
  );

  TestValidator.equals(
    "deleted_at should remain unchanged when not provided in update",
    updated.deleted_at ?? null,
    originalDeletedAt,
  );

  TestValidator.equals(
    "created_at should remain unchanged",
    updated.created_at,
    originalCreatedAt,
  );

  // 6. Validate updated_at time ordering
  // Compare ISO strings lexicographically as they are in date-time format.
  TestValidator.predicate(
    "updated_at should be at or after original updated_at",
    updated.updated_at >= originalUpdatedAt,
  );

  TestValidator.predicate(
    "updated_at should be at or after created_at",
    updated.updated_at >= updated.created_at,
  );
}
