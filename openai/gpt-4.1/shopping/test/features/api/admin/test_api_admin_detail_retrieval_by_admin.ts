import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test retrieving administrator details and RBAC enforcement.
 *
 * This test covers the following scenarios for GET
 * /shoppingMall/admin/admins/{adminId}:
 *
 * 1. Register a new admin and authenticate (save id/token)
 * 2. Successfully retrieve details using the admin's id and an admin session
 *
 *    - Validate all returned fields match IShoppingMallAdmin (no sensitive data like
 *         password)
 *    - Validate the returned record matches original registration data (except
 *         timestamps/ids)
 * 3. Error: Attempt to access detail for random/nonexistent adminId (should fail
 *    with not-found)
 * 4. Error: Attempt to access with unauthenticated session (should fail)
 * 5. Error: Attempt to access with invalid/expired token (should fail)
 *
 * Assumptions:
 *
 * - Only authenticated admins can use this endpoint (RBAC enforced)
 * - Email, name, and status are included in the response
 * - System-managed fields (created_at/updated_at) are present
 *
 * Steps:
 *
 * 1. Register a new admin (random unique email + secure password + name)
 * 2. Fetch the registered admin's full detail using their id
 * 3. Assert all expected fields exist
 * 4. Assert no password or sensitive fields exposed (not possible via DTO, but
 *    double check)
 * 5. Assert error when requesting with random UUID (not found)
 * 6. Assert error when not authenticated
 */
export async function test_api_admin_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const createAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: createAdminBody,
  });
  typia.assert(adminAuth);

  // 2. Retrieve admin detail with correct admin session
  const adminDetail = await api.functional.shoppingMall.admin.admins.at(
    connection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(adminDetail);
  // Validate the fields are matching what was registered (except timestamps)
  TestValidator.equals("admin id matches", adminDetail.id, adminAuth.id);
  TestValidator.equals(
    "admin email matches",
    adminDetail.email,
    createAdminBody.email,
  );
  TestValidator.equals(
    "admin name matches",
    adminDetail.name,
    createAdminBody.name,
  );
  // No sensitive fields present by DTO definition; check type only

  // 3. Attempt retrieval with random non-existent adminId (should error)
  await TestValidator.error("not-found for random admin id", async () => {
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 4. Attempt retrieval with unauthenticated session (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access fails", async () => {
    await api.functional.shoppingMall.admin.admins.at(unauthConn, {
      adminId: adminAuth.id,
    });
  });

  // 5. Attempt retrieval after token removal/invalid (simulate invalid session)
  // We'll simulate by deleting headers and using again (effectively like 4), or use random invalid token
  const invalidConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid-token" },
  };
  await TestValidator.error("invalid token access fails", async () => {
    await api.functional.shoppingMall.admin.admins.at(invalidConn, {
      adminId: adminAuth.id,
    });
  });
}
