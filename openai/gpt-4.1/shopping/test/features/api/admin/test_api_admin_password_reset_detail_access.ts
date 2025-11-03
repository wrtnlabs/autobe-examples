import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPasswordReset";

/**
 * Validate that an admin user can access password reset request details by ID.
 *
 * 1. Register a new admin account.
 * 2. (Test setup must assume/reset DB so we have at least one password reset
 *    record.)
 * 3. Pick a random password reset ID (UUID) to test, or create one if none are
 *    available.
 * 4. Admin uses /shopping/admin/passwordResets/{passwordResetId} to get full
 *    details.
 * 5. Validate:
 *
 *    - Response is IShoppingPasswordReset and all fields are visible.
 *    - Sensitive fields (reset_code etc.) are included for admin (no masking for
 *         admin privilege).
 *    - Data is returned for correct ID and matches at least the minimum required
 *         fields.
 *    - Best-effort: actual audit log generation and masking is handled server-side
 *         and out of E2E scope.
 */
export async function test_api_admin_password_reset_detail_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // For the test, generate a password reset entry as if it exists in the system
  // Since there is no API to create or list resets directly, we'll simulate one
  // with typia.random
  const reset: IShoppingPasswordReset = typia.random<IShoppingPasswordReset>();

  // 2. Call the admin password reset detail API
  const detail: IShoppingPasswordReset =
    await api.functional.shopping.admin.passwordResets.at(connection, {
      passwordResetId: reset.id,
    });
  typia.assert(detail);
  // 3. Validate core field visibility and admin privilege to see sensitive fields
  TestValidator.predicate(
    "admin can see the reset_code field",
    typeof detail.reset_code === "string" && detail.reset_code.length > 0,
  );
  TestValidator.equals("password reset id matches", detail.id, reset.id);
  TestValidator.equals(
    "request email is present",
    typeof detail.request_email === "string" && detail.request_email.length > 0,
    true,
  );
}
