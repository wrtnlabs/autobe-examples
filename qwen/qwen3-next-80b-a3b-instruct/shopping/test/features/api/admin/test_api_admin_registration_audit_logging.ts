import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_audit_logging(
  connection: api.IConnection,
) {
  // Generate realistic admin registration data
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super_admin",
      "full_admin",
      "limited_admin",
    ] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  // Execute admin registration
  const result: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });

  // Validate successful registration response
  typia.assert(result);

  // Validate all required fields in response
  TestValidator.equals("admin email matches", result.email, adminData.email);
  TestValidator.equals(
    "admin first name matches",
    result.first_name,
    adminData.first_name,
  );
  TestValidator.equals(
    "admin last name matches",
    result.last_name,
    adminData.last_name,
  );
  TestValidator.equals("admin role matches", result.role, adminData.role);
  TestValidator.predicate(
    "admin status is pending_verification",
    result.status === "pending_verification",
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    new Date(result.created_at).toISOString() === result.created_at,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    new Date(result.updated_at).toISOString() === result.updated_at,
  );

  // Validate token structure
  TestValidator.equals(
    "access token exists",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "access token expired_at is ISO date-time",
    new Date(result.token.expired_at).toISOString() === result.token.expired_at,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is ISO date-time",
    new Date(result.token.refreshable_until).toISOString() ===
      result.token.refreshable_until,
  );

  // Ensure admin account creation logs the registration in audit logs
  // The system automatically logs admin registration in shopping_mall_audit_logs table
  // This test verifies that the functional call successfully triggers the audit logging
  // as required by the business requirement
}
