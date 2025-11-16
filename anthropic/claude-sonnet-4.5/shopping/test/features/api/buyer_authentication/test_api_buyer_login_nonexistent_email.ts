import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer login attempt with non-existent email address.
 *
 * This test validates that the authentication system properly rejects login
 * attempts for email addresses that do not exist in the shopping_mall_buyers
 * table. It ensures the system maintains security by not revealing account
 * existence information and prevents unauthorized access.
 *
 * Test Flow:
 *
 * 1. Generate a random, well-formed email address (valid RFC 5322 format)
 * 2. Create login credentials with the non-existent email
 * 3. Attempt to authenticate via the buyer login API
 * 4. Verify that authentication fails with an appropriate error
 * 5. Confirm no session or authorization tokens are issued
 */
export async function test_api_buyer_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create login request with non-existent email
  const loginRequest = {
    email: nonExistentEmail,
    password: "anyPassword123",
    ip: "127.0.0.1",
    href: "https://example-shop.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example-shop.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ILogin;

  // Attempt login and expect it to fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.buyer.login(connection, {
        body: loginRequest,
      });
    },
  );
}
