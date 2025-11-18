import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate deletion behavior and potential "last admin" protection for todoApp
 * administrative users.
 *
 * Business intent:
 *
 * - Ensure that basic admin lifecycle operations work via the provided SDK:
 *   creating administrative users with POST /auth/adminUser/join and deleting
 *   them with DELETE /todoApp/adminUser/adminUsers/{adminUserId}.
 * - Probe whether the backend enforces a rule preventing deletion of the last
 *   remaining admin account (self-delete scenario) without breaking the test
 *   when such a rule is absent.
 * - Confirm that, when multiple admins exist, at least one admin record can be
 *   deleted successfully.
 *
 * Constraints from available APIs:
 *
 * - We only have two operations: admin join (create + issue token) and erase
 *   (delete by UUID). There are no list/count/search endpoints for admins and
 *   no audit log APIs, so we cannot assert exact admin counts or inspect logs.
 * - Join automatically sets connection.headers.Authorization using the issued
 *   access token; tests must not touch headers directly.
 * - Erase returns void on success and throws HttpError on failure.
 *
 * Scenario steps:
 *
 * 1. Single-admin self-delete attempt (potential last-admin protection) 1.1. Call
 *    api.functional.auth.adminUser.join to create adminA using
 *    typia.random<ITodoAppAdminUser.IJoin>() as the request payload. 1.2.
 *    Assert the join response with typia.assert and capture adminA.id and email
 *    for sanity checks. 1.3. While authenticated as adminA (connection mutated
 *    by join), call api.functional.todoApp.adminUser.adminUsers.erase with
 *    adminUserId = adminA.id. 1.4. Accept both behaviors as valid: - If erase
 *    succeeds, the environment does not enforce last-admin protection. - If
 *    erase throws an HttpError, we interpret it as a protection rule (e.g.,
 *    last-admin cannot be deleted) and still treat the test as successful.
 * 2. Multi-admin deletion (successful delete when multiple admins exist) 2.1. Call
 *    join again to create adminB; typia.assert the response and record its id.
 *    2.2. Call join a third time to create adminC; typia.assert the response
 *    and record its id. After this call, the connection is authenticated as
 *    adminC. 2.3. Attempt to delete one of the admins (e.g., adminB) using
 *    erase, passing adminUserId = adminB.id. 2.4. Assert that erase does not
 *    throw (a straightforward successful path where the system is not left
 *    without any admin user at all).
 * 3. Basic sanity validations:
 *
 *    - Use TestValidator.equals to ensure that emails returned from join are stable
 *         values we pass into erase.
 *    - Avoid extra type validations beyond typia.assert, focusing instead on
 *         business-level expectations.
 */
export async function test_api_admin_user_delete_last_admin_protection(
  connection: api.IConnection,
) {
  // 1. Single-admin self-delete attempt
  const adminAJoinInput = typia.random<ITodoAppAdminUser.IJoin>();

  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: adminAJoinInput,
  });
  typia.assert(adminA);

  TestValidator.equals(
    "adminA email matches join input",
    adminA.email,
    adminAJoinInput.email,
  );

  // Try to delete adminA as the only admin. This may or may not be allowed
  // depending on backend configuration. We accept both outcomes:
  // - Success: environment does not enforce last-admin protection.
  // - HttpError: environment enforces a protection rule.
  try {
    await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
      adminUserId: adminA.id,
    });
  } catch {
    // Intentionally swallow the error: its mere presence indicates that the
    // backend rejected self-delete, which is an acceptable behavior for this
    // test. We do not inspect status codes or messages.
  }

  // 2. Multi-admin deletion scenario
  const adminBJoinInput = typia.random<ITodoAppAdminUser.IJoin>();
  const adminB = await api.functional.auth.adminUser.join(connection, {
    body: adminBJoinInput,
  });
  typia.assert(adminB);

  const adminCJoinInput = typia.random<ITodoAppAdminUser.IJoin>();
  const adminC = await api.functional.auth.adminUser.join(connection, {
    body: adminCJoinInput,
  });
  typia.assert(adminC);

  TestValidator.equals(
    "adminB email matches join input",
    adminB.email,
    adminBJoinInput.email,
  );
  TestValidator.equals(
    "adminC email matches join input",
    adminC.email,
    adminCJoinInput.email,
  );

  // Attempt to delete adminB while at least adminC remains.
  await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
    adminUserId: adminB.id,
  });
}
