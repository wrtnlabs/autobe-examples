import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_create_invalid_email(
  connection: api.IConnection,
) {
  // Step 1: Create a setup with invalid email format that violates RFC 5322 standard
  const invalidEmail = "invalid-email"; // Not conforming to RFC 5322
  const adminBody = {
    email: invalidEmail,
    password: "SecurePassword123!",
    first_name: "Invalid",
    last_name: "Admin",
    role: "full_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  // Step 2: Attempt to create admin account with invalid email
  await TestValidator.error(
    "admin account creation with invalid email should fail with 400 Bad Request",
    async () => {
      await api.functional.shoppingMall.admin.actors.admins.create(connection, {
        body: adminBody,
      });
    },
  );
}
