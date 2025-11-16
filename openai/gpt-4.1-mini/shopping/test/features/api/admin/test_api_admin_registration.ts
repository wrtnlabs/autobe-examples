import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration(connection: api.IConnection) {
  // Generate realistic test data for a new admin user registration
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(16); // secure random password
  const phone_number: string | null = null; // Optional phone number null

  // Randomly pick a valid role from allowed enum
  const roles = ["superadmin", "admin", "support"] as const;
  const role = RandomGenerator.pick(roles);

  // Construct request body with all required fields
  const body = {
    email: email,
    name: name,
    password: password,
    phone_number: phone_number,
    role: role,
  } satisfies IShoppingMallAdmin.ICreate;

  // Call the admin registration API
  const output = await api.functional.auth.admin.join(connection, { body });

  // Assert correct output type and all required properties
  typia.assert(output);

  // Validate that returned admin is active
  TestValidator.predicate("admin account is active", output.is_active === true);

  // Validate that returned admin has the requested role
  TestValidator.equals("admin role matches input", output.role, role);

  // Validate that returned email matches input
  TestValidator.equals("admin email matches input", output.email, email);

  // Validate that name matches input
  TestValidator.equals("admin name matches input", output.name, name);

  // Validate that token object exists and has expected properties
  TestValidator.predicate(
    "token access token exists",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh token exists",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid ISO 8601 string",
    typeof output.token.expired_at === "string" &&
      /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(.\\d+)?Z/.test(
        output.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO 8601 string",
    typeof output.token.refreshable_until === "string" &&
      /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(.\\d+)?Z/.test(
        output.token.refreshable_until,
      ),
  );
}
