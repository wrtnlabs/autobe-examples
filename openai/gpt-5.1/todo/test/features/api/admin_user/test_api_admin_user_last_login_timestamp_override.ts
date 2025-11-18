import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that privileged admin tooling can override and clear the
 * `last_login_at` audit timestamp for an administrative user.
 *
 * Business workflow:
 *
 * 1. Register an admin user via POST /auth/adminUser/join and obtain an
 *    ITodoAppAdminUser.IAuthorized payload. This also configures the
 *    Authorization header on the shared connection.
 * 2. Use the returned admin id as adminUserId and call PUT
 *    /todoApp/adminUser/adminUsers/{adminUserId} with an
 *    ITodoAppAdminUser.IUpdate body that sets `last_login_at` to a specific
 *    past ISO-8601 date-time string.
 * 3. Assert that the response ITodoAppAdminUser reflects the overridden
 *    `last_login_at` value, while preserving core fields like `email` and
 *    `status`.
 * 4. Call the same update endpoint again, this time explicitly setting
 *    `last_login_at` to null to clear the audit field.
 * 5. Assert that `last_login_at` becomes null, other key fields remain unchanged,
 *    and `updated_at` has advanced to reflect the last modification time.
 */
export async function test_api_admin_user_last_login_timestamp_override(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalStatus = authorized.status;
  const originalFailedLoginCount = authorized.failed_login_count;
  const originalDeletedAt = authorized.deleted_at ?? null;

  // 2. Prepare a specific past last_login_at timestamp
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const overriddenLastLoginAt: string & tags.Format<"date-time"> =
    pastDate.toISOString() as string & tags.Format<"date-time">;

  const firstUpdateBody = {
    last_login_at: overriddenLastLoginAt,
  } satisfies ITodoAppAdminUser.IUpdate;

  const firstUpdated: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: originalId,
      body: firstUpdateBody,
    });
  typia.assert<ITodoAppAdminUser>(firstUpdated);

  // Validate that id/email/status remain consistent and last_login_at updated
  TestValidator.equals(
    "admin id should remain unchanged after first last_login_at override",
    firstUpdated.id,
    originalId,
  );
  TestValidator.equals(
    "admin email should remain unchanged after first last_login_at override",
    firstUpdated.email,
    originalEmail,
  );
  TestValidator.equals(
    "admin status should remain unchanged after first last_login_at override",
    firstUpdated.status,
    originalStatus,
  );
  TestValidator.equals(
    "failed_login_count should remain unchanged after first last_login_at override",
    firstUpdated.failed_login_count,
    originalFailedLoginCount,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged after first last_login_at override",
    firstUpdated.deleted_at ?? null,
    originalDeletedAt,
  );
  TestValidator.equals(
    "last_login_at should be overridden to the specified past timestamp",
    firstUpdated.last_login_at ?? null,
    overriddenLastLoginAt,
  );

  const firstUpdatedAt = firstUpdated.updated_at;

  // 3. Second update: explicitly clear last_login_at by setting it to null
  const secondUpdateBody = {
    last_login_at: null,
  } satisfies ITodoAppAdminUser.IUpdate;

  const secondUpdated: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: originalId,
      body: secondUpdateBody,
    });
  typia.assert<ITodoAppAdminUser>(secondUpdated);

  // Validate invariants and clearing behavior
  TestValidator.equals(
    "admin id should remain unchanged after clearing last_login_at",
    secondUpdated.id,
    originalId,
  );
  TestValidator.equals(
    "admin email should remain unchanged after clearing last_login_at",
    secondUpdated.email,
    originalEmail,
  );
  TestValidator.equals(
    "admin status should remain unchanged after clearing last_login_at",
    secondUpdated.status,
    originalStatus,
  );
  TestValidator.equals(
    "failed_login_count should remain unchanged after clearing last_login_at",
    secondUpdated.failed_login_count,
    originalFailedLoginCount,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged after clearing last_login_at",
    secondUpdated.deleted_at ?? null,
    originalDeletedAt,
  );
  TestValidator.equals(
    "last_login_at should be cleared to null after explicit null update",
    secondUpdated.last_login_at ?? null,
    null,
  );

  // Ensure updated_at reflects the latest modification (second update should be newer or equal)
  TestValidator.predicate(
    "updated_at after second update should be greater than or equal to first updated_at",
    new Date(secondUpdated.updated_at).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );
}
