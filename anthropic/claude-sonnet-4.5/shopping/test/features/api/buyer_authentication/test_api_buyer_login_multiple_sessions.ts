import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test multiple concurrent login sessions for a single buyer account.
 *
 * Validates that the shopping mall authentication system supports multiple
 * active sessions for the same buyer account, enabling buyers to remain logged
 * in across different devices and browsers simultaneously. This test creates a
 * buyer account and performs three separate login operations with different
 * session contexts (simulating different devices/browsers), then verifies
 * that:
 *
 * 1. All login attempts succeed independently
 * 2. Each login creates a unique session with distinct tokens
 * 3. Access tokens are unique across all sessions
 * 4. Refresh tokens are unique across all sessions
 * 5. All sessions can coexist without invalidating each other
 * 6. Each session maintains independent expiration tracking
 *
 * This functionality is critical for modern e-commerce platforms where users
 * expect seamless experiences across mobile, desktop, and tablet devices.
 */
export async function test_api_buyer_login_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account for testing
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerFullName = RandomGenerator.name();

  const registrationBody = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: buyerFullName,
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredBuyer);

  // Step 2: Perform first login from "device 1" (e.g., desktop browser)
  const device1Href = typia.random<string & tags.Format<"uri">>();
  const device1Referrer = typia.random<string & tags.Format<"uri">>();

  const session1: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        href: device1Href,
        referrer: device1Referrer,
      } satisfies IShoppingMallBuyer.ILogin,
    });
  typia.assert(session1);

  // Step 3: Perform second login from "device 2" (e.g., mobile phone)
  const device2Href = typia.random<string & tags.Format<"uri">>();
  const device2Referrer = typia.random<string & tags.Format<"uri">>();

  const session2: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        href: device2Href,
        referrer: device2Referrer,
      } satisfies IShoppingMallBuyer.ILogin,
    });
  typia.assert(session2);

  // Step 4: Perform third login from "device 3" (e.g., tablet)
  const device3Href = typia.random<string & tags.Format<"uri">>();
  const device3Referrer = typia.random<string & tags.Format<"uri">>();

  const session3: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        href: device3Href,
        referrer: device3Referrer,
      } satisfies IShoppingMallBuyer.ILogin,
    });
  typia.assert(session3);

  // Step 5: Validate that all sessions have unique access tokens
  const accessTokens = [
    session1.token.access,
    session2.token.access,
    session3.token.access,
  ];

  const uniqueAccessTokens = new Set(accessTokens);
  TestValidator.predicate(
    "all access tokens should be unique",
    uniqueAccessTokens.size === 3,
  );

  // Step 6: Validate that all sessions have unique refresh tokens
  const refreshTokens = [
    session1.token.refresh,
    session2.token.refresh,
    session3.token.refresh,
  ];

  const uniqueRefreshTokens = new Set(refreshTokens);
  TestValidator.predicate(
    "all refresh tokens should be unique",
    uniqueRefreshTokens.size === 3,
  );

  // Step 7: Validate that all sessions have the same buyer information
  TestValidator.equals(
    "session 1 buyer ID matches",
    session1.id,
    registeredBuyer.id,
  );
  TestValidator.equals(
    "session 2 buyer ID matches",
    session2.id,
    registeredBuyer.id,
  );
  TestValidator.equals(
    "session 3 buyer ID matches",
    session3.id,
    registeredBuyer.id,
  );

  TestValidator.equals("session 1 email matches", session1.email, buyerEmail);
  TestValidator.equals("session 2 email matches", session2.email, buyerEmail);
  TestValidator.equals("session 3 email matches", session3.email, buyerEmail);
}
