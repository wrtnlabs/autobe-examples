import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test case 1: Email without @ symbol
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "invalidemail", // Missing @ symbol
          password: "password123",
          first_name: "John",
          last_name: "Doe",
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test case 2: Email with invalid domain (empty after @)
  await TestValidator.error(
    "should reject email with invalid domain",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "user@", // Invalid domain (empty after @)
          password: "password123",
          first_name: "John",
          last_name: "Doe",
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test case 3: Email with multiple @ symbols
  await TestValidator.error(
    "should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "user@@domain.com", // Multiple @ symbols
          password: "password123",
          first_name: "John",
          last_name: "Doe",
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test case 4: Email with invalid characters in local part
  await TestValidator.error(
    "should reject email with invalid characters in local part",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "user!name@example.com", // Invalid character '!' in local part
          password: "password123",
          first_name: "John",
          last_name: "Doe",
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test case 5: Email with excessively long local part
  await TestValidator.error(
    "should reject email with excessively long local part",
    async () => {
      const longLocal = RandomGenerator.alphaNumeric(65); // Exceeds 64-character limit
      await api.functional.auth.admin.join(connection, {
        body: {
          email: `${longLocal}@example.com`, // Local part exceeds 64 characters
          password: "password123",
          first_name: "John",
          last_name: "Doe",
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );
}
