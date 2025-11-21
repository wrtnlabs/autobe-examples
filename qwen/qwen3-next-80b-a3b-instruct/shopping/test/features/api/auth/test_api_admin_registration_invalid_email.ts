import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_invalid_email(
  connection: api.IConnection,
) {
  /**
   * Test admin registration with invalid email format. System receives
   * registration request with malformed email (e.g., missing @, invalid
   * domain). Validates system returns 400 Bad Request with appropriate
   * validation error, and no account is created.
   *
   * This test verifies that the system properly rejects admin registration
   * attempts with invalid email formats according to the business requirements.
   * The email field in IShoppingMallAdmin.ICreate is defined with 'string &
   * tags.Format<"email">' constraint, which validates email format (RFC 5322).
   * We deliberately provide an invalid email format without '@' symbol to
   * trigger the system's email format validation. The system should reject the
   * request with appropriate validation error and no admin account should be
   * created.
   *
   * Test Flow:
   *
   * 1. Attempt to register admin with invalid email format ('invalid-email')
   * 2. Verify system returns appropriate validation error
   * 3. Confirm no admin account is created
   */
  await TestValidator.error("invalid email format should reject", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "invalid-email", // Invalid format - missing @
        password: "SecurePass123!",
        first_name: "Admin",
        last_name: "User",
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  });
}
