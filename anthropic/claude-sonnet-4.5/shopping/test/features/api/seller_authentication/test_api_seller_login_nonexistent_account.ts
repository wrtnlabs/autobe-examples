import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller login attempt with a non-existent account email.
 *
 * This test validates that the seller authentication endpoint properly rejects
 * login attempts for email addresses that do not exist in the system. It
 * ensures the API maintains proper security by preventing authentication with
 * unregistered credentials while following best practices against account
 * enumeration attacks.
 *
 * Test workflow:
 *
 * 1. Generate a random email address that has never been registered
 * 2. Attempt to authenticate using the non-existent email with login credentials
 * 3. Verify that the authentication fails with an error response
 * 4. Confirm no authentication tokens are issued for non-existent accounts
 */
export async function test_api_seller_login_nonexistent_account(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Generate session context URLs with proper URI format
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  // Attempt to login with non-existent account credentials - this must fail
  await TestValidator.error(
    "login with non-existent seller email must fail",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "anyPassword123",
          href: sessionHref,
          referrer: sessionReferrer,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
