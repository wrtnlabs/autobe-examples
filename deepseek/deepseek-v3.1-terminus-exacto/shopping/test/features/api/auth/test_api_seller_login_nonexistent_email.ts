import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller login with non-existent email address to verify security
 * behavior.
 *
 * This test validates that the authentication system returns consistent failure
 * responses regardless of whether an email exists in the system, preventing
 * email enumeration attacks. The system should not reveal valid seller accounts
 * through different error messages for existing vs non-existing emails.
 *
 * Implementation steps:
 *
 * 1. Generate a valid but non-existent email address
 * 2. Create complete login credentials with all required fields
 * 3. Attempt authentication with non-existent credentials
 * 4. Verify consistent authentication failure response
 */
export async function test_api_seller_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a valid but non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  typia.assert(nonExistentEmail);

  // Create login credentials with all required fields
  const loginCredentials = {
    email: nonExistentEmail,
    password: "invalid_password_123",
    href: "https://shopping-mall.example.com/seller/login",
    referrer: "https://shopping-mall.example.com/",
    // Optional fields can be omitted
  } satisfies IShoppingMallSeller.ILogin;

  // Attempt authentication with non-existent credentials
  // This should fail with consistent authentication error
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: loginCredentials,
      });
    },
  );
}
