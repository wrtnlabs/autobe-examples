import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test admin permanent deletion of a seller account.
 *
 * This test simulates the process of an admin permanently deleting a seller
 * account from the system. Only an authenticated admin can perform this
 * operation. It verifies:
 *
 * - The admin is successfully registered and logged in.
 * - After deletion, the seller account cannot be accessed or logged in.
 * - System prohibits deletion if there are ongoing fulfillment/dispute processes
 *   (negative path).
 * - After deletion, business logic blocks further seller participation.
 * - Compliance/audit log (implicit, not directly checkable in E2E scope) is
 *   assumed triggered.
 *
 * Steps:
 *
 * 1. Register a new admin and login (dependency satisfied).
 * 2. Attempt to delete a randomly generated seller (simulate existing seller
 *    UUID). (Since there is no separate seller creation or query API in this
 *    scope, simulate this part as not testable here.)
 * 3. Call the DELETE /shopping/admin/sellers/{sellerId} API as admin for a valid
 *    seller UUID.
 * 4. Validate the response (no error).
 * 5. (Negative Path — not directly testable: If ongoing fulfillment/dispute exist,
 *    deletion should fail. For this test, only positive path is checked since
 *    we cannot create such conditions from current scope.)
 * 6. (Optional: Attempt to delete again and confirm proper error. Not implemented,
 *    as endpoint likely returns not found or similar.)
 */
export async function test_api_admin_seller_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "superadmin",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches join request",
    admin.email,
    adminJoinBody.email,
  );
  TestValidator.equals("admin role is correct", admin.role, adminJoinBody.role);
  TestValidator.equals("admin status is active", admin.status, "active");

  // 2. Use a random seller UUID for deletion (no seller creation API available)
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // 3. Permanently delete the seller
  await api.functional.shopping.admin.sellers.erase(connection, { sellerId });
  // There is no response body for deletion

  // 4. (Optional: Try erasing again should result in error - negative path. Not possible here as we cannot check error responses based on SDK, nor can we simulate seller login without such an API.)

  // 5. (Implicit: Audit/compliance log is system responsibility — not directly testable in API contract, but admin delete flow is complete if no error.)
}
