import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_join_successful_registration(
  connection: api.IConnection,
) {
  // 1. Generate realistic test data for a new admin user registration
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name();
  const password = "StrongPassw0rd!";
  const phone_number = RandomGenerator.mobile();
  const role = "superadmin" as const;

  const requestBody = {
    email,
    name,
    password,
    phone_number,
    role,
  } satisfies IShoppingMallAdmin.ICreate;

  // 2. Call the admin join API endpoint
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: requestBody,
    });

  // 3. Validate the response structure and types
  typia.assert(authorized);

  // 4. Validate the admin user details match the request
  TestValidator.equals("admin email matches", authorized.email, email);
  TestValidator.equals("admin name matches", authorized.name, name);
  TestValidator.equals("admin role matches", authorized.role, role);
  TestValidator.predicate("admin account is active", authorized.is_active);

  // 5. Assert the token object presence and structure
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid ISO date-time",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO date-time",
    !isNaN(Date.parse(token.refreshable_until)),
  );
}
