import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_weak_password(
  connection: api.IConnection,
) {
  // Test that admin registration fails with passwords that don't meet security requirements
  // Test weak password: too short (less than 8 characters)
  await TestValidator.error(
    "registration should fail with password shorter than 8 characters",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "short12", // 7 characters - too short
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test weak password: no uppercase letter
  await TestValidator.error(
    "registration should fail with password without uppercase letter",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "lowercase123", // all lowercase, no uppercase
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test weak password: no lowercase letter
  await TestValidator.error(
    "registration should fail with password without lowercase letter",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "UPPERCASE123", // all uppercase, no lowercase
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test weak password: no number
  await TestValidator.error(
    "registration should fail with password without number",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "NoNumbersHere", // letters only, no numbers
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test weak password: only letters and numbers (no special characters)
  await TestValidator.error(
    "registration should fail with password without special characters",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "Password123", // has uppercase, lowercase, number, but no special chars
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // Test valid password (should pass) - for verification
  const validAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongP@ssw0rd!", // 12+ chars with uppercase, lowercase, number, special char
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(validAdmin);
}
