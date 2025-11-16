import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test administrator login with invalid credentials.
 *
 * This test validates that the authentication system properly rejects
 * unauthorized access attempts by testing two critical security scenarios:
 *
 * 1. Valid email with incorrect password - ensures password verification works
 * 2. Non-existent email address - ensures the system handles unknown accounts
 *
 * Both scenarios must fail authentication and throw errors to prevent
 * unauthorized access to the admin platform.
 *
 * Steps:
 *
 * 1. Create a valid admin account with known credentials
 * 2. Attempt login with correct email but wrong password (must fail)
 * 3. Attempt login with non-existent email address (must fail)
 */
export async function test_api_admin_authentication_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a valid admin account with known credentials
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = typia.random<string & tags.Format<"password">>();

  const adminCreateBody = {
    email: validEmail,
    password: validPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(createdAdmin);

  // Step 2: Attempt login with correct email but WRONG password
  const wrongPassword = typia.random<string & tags.Format<"password">>();

  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: validEmail,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Step 3: Attempt login with non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentEmail,
          password: typia.random<string & tags.Format<"password">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );
}
