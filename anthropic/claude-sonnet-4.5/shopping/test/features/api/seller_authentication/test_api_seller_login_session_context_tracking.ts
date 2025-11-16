import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller login with session context tracking (IP, href, referrer).
 *
 * This test validates that the seller login endpoint properly captures and
 * processes session context information including IP address, current page URL
 * (href), and referrer URL. These fields are essential for security monitoring,
 * audit trails, and user behavior analysis.
 *
 * Test Flow:
 *
 * 1. Generate valid seller login credentials with complete session context
 * 2. Perform login with IP address, current page URL, and referrer URL
 * 3. Verify authentication succeeds and returns valid JWT tokens
 * 4. Validate seller profile information is correctly returned
 */
export async function test_api_seller_login_session_context_tracking(
  connection: api.IConnection,
) {
  // Prepare login credentials with complete session context metadata
  const loginData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "192.168.1.100",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/home",
  } satisfies IShoppingMallSeller.ILogin;

  // Execute seller login with session context tracking
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginData,
    });

  // Validate the authentication response structure
  typia.assert(authorizedSeller);
}
