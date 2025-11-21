import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_non_bcrypt_password_hash(
  connection: api.IConnection,
) {
  // Generate realistic admin registration data with non-BCrypt password
  const password = "password123"; // plaintext password - not BCrypt hash
  const email = typia.random<string & tags.Format<"email">>();
  const firstName = RandomGenerator.name();
  const lastName = RandomGenerator.name();
  const role: "super_admin" | "full_admin" | "limited_admin" =
    RandomGenerator.pick([
      "super_admin",
      "full_admin",
      "limited_admin",
    ] as const);

  // Register admin with non-BCrypt password - system should accept and handle it
  const result: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
      } satisfies IShoppingMallAdmin.ICreate,
    });

  // Validate response structure and data
  typia.assert(result);
  TestValidator.equals("email matches", result.email, email);
  TestValidator.equals("first name matches", result.first_name, firstName);
  TestValidator.equals("last name matches", result.last_name, lastName);
  TestValidator.equals("role matches", result.role, role);
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(result.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(result.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate(
    "token access is string",
    () => typeof result.token.access === "string",
  );
  TestValidator.predicate(
    "token refresh is string",
    () => typeof result.token.refresh === "string",
  );
  TestValidator.predicate("token expired_at is valid date-time", () => {
    const date = new Date(result.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("token refreshable_until is valid date-time", () => {
    const date = new Date(result.token.refreshable_until);
    return !isNaN(date.getTime());
  });
}
