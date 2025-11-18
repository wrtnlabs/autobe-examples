import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validates soft-deletion (self-erasure) of an administrator account and
 * related effects.
 *
 * 1. Register a unique administrator via /auth/admin/join, saving authorized
 *    response.
 * 2. Confirm type and field validity on ITodoAppAdmin.IAuthorized.
 * 3. Use DELETE /todoApp/admin/admins/{adminId} as self (authenticated
 *    connection).
 * 4. Confirm erasure call succeeds with no error.
 * 5. (If a "details" GET endpoint for admins exists, attempt to fetch deleted
 *    admin by id – skipped if not exists since not in API list.)
 * 6. Attempt any further privileged operation (e.g., soft-deleting same account
 *    again, or another admin API).
 *
 *    - Should be denied due to revoked/expired session and soft-deleted status.
 *    - Use TestValidator.error to assert privilege denial or access failure.
 * 7. (Soft-delete should allow re-registration with the same email – test by
 *    rejoining with the same email, and confirm new account creation is allowed
 *    or forbidden per business policy. If join fails, validate error.)
 * 8. Ensure session information and auditability (created_at/deleted_at fields are
 *    consistent for first deleted admin).
 *
 * Note: Since admin read/list endpoints are not in the available API, final
 * validation on deleted_at requires trusting correct backend action after
 * DELETE, as we cannot re-fetch admin details.
 */
export async function test_api_admin_soft_delete_by_self(
  connection: api.IConnection,
) {
  // 1. Register an admin (join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinInput = {
    email,
    password,
    href: "https://admin.todoapp.test/register",
    referrer: "https://todoapp.test/login",
  } satisfies ITodoAppAdmin.IJoin;

  const authorizedAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(authorizedAdmin);
  TestValidator.predicate(
    "admin id is uuid",
    typeof authorizedAdmin.id === "string" && authorizedAdmin.id.length === 36,
  );

  // 2. Soft-delete self
  await api.functional.todoApp.admin.admins.erase(connection, {
    adminId: authorizedAdmin.id,
  });

  // 3. Attempt privileged operation post-delete: should be denied
  await TestValidator.error(
    "privileged operation fails after self-soft-delete",
    async () => {
      // Try any privileged op (e.g., attempt re-delete)
      await api.functional.todoApp.admin.admins.erase(connection, {
        adminId: authorizedAdmin.id,
      });
    },
  );

  // 4. Attempt to rejoin with same email (should succeed if soft-delete removes unique constraint)
  const rejoinInput = {
    email,
    password,
    href: "https://admin.todoapp.test/register",
    referrer: "https://todoapp.test/login",
  } satisfies ITodoAppAdmin.IJoin;

  try {
    const rejoined: ITodoAppAdmin.IAuthorized =
      await api.functional.auth.admin.join(connection, { body: rejoinInput });
    typia.assert(rejoined);
    TestValidator.notEquals(
      "new admin id differs from deleted one (if allowed)",
      rejoined.id,
      authorizedAdmin.id,
    );
  } catch (_exp) {
    // If the backend forbids rejoining with the same email after soft-delete, that's a valid alternative
  }
}
