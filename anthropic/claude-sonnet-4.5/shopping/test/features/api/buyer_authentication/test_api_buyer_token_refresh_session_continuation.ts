import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that buyer token refresh maintains session continuity and preserves user
 * context.
 *
 * This test validates the critical session continuation functionality during
 * token refresh operations. It ensures that when buyers refresh their
 * authentication tokens, their session remains intact, their identity is
 * preserved, and they can continue using the platform seamlessly without
 * re-authentication.
 *
 * The test workflow:
 *
 * 1. Create new buyer account and obtain initial authentication tokens
 * 2. Store the initial buyer identity information (ID, email, etc.)
 * 3. Perform first token refresh using the refresh token
 * 4. Validate that buyer identity remains exactly the same after refresh
 * 5. Verify that new valid tokens were issued
 * 6. Perform second consecutive token refresh to test multiple refresh cycles
 * 7. Again validate identity preservation and new token issuance
 * 8. Perform third consecutive refresh to thoroughly test the refresh mechanism
 * 9. Final validation of complete session integrity across all refresh operations
 */
export async function test_api_buyer_token_refresh_session_continuation(
  connection: api.IConnection,
) {
  // Step 1: Create new buyer account with initial authentication
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const initialBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(initialBuyer);

  // Store initial buyer identity for comparison
  const initialBuyerId = initialBuyer.id;
  const initialEmail = initialBuyer.email;
  const initialFullName = initialBuyer.full_name;
  const initialRefreshToken = initialBuyer.token.refresh;

  // Validate initial authentication response - only business logic, no type checks
  TestValidator.equals("initial buyer email matches", initialEmail, buyerEmail);

  // Step 2: Perform first token refresh
  const firstRefresh: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.refresh(connection, {
      body: {
        refresh: initialRefreshToken,
      } satisfies IShoppingMallBuyer.IRefresh,
    });
  typia.assert(firstRefresh);

  // Validate session continuity after first refresh
  TestValidator.equals(
    "buyer ID preserved after first refresh",
    firstRefresh.id,
    initialBuyerId,
  );
  TestValidator.equals(
    "buyer email preserved after first refresh",
    firstRefresh.email,
    initialEmail,
  );
  TestValidator.equals(
    "buyer name preserved after first refresh",
    firstRefresh.full_name,
    initialFullName,
  );
  TestValidator.equals(
    "phone number preserved after first refresh",
    firstRefresh.phone_number,
    initialBuyer.phone_number,
  );
  TestValidator.equals(
    "email verification status preserved",
    firstRefresh.email_verified,
    initialBuyer.email_verified,
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    firstRefresh.created_at,
    initialBuyer.created_at,
  );

  // Step 3: Perform second consecutive token refresh using the new refresh token
  const secondRefresh: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.refresh(connection, {
      body: {
        refresh: firstRefresh.token.refresh,
      } satisfies IShoppingMallBuyer.IRefresh,
    });
  typia.assert(secondRefresh);

  // Validate session continuity after second refresh
  TestValidator.equals(
    "buyer ID preserved after second refresh",
    secondRefresh.id,
    initialBuyerId,
  );
  TestValidator.equals(
    "buyer email preserved after second refresh",
    secondRefresh.email,
    initialEmail,
  );
  TestValidator.equals(
    "buyer name preserved after second refresh",
    secondRefresh.full_name,
    initialFullName,
  );
  TestValidator.equals(
    "phone number preserved after second refresh",
    secondRefresh.phone_number,
    initialBuyer.phone_number,
  );

  // Step 4: Perform third consecutive token refresh to thoroughly test multiple cycles
  const thirdRefresh: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.refresh(connection, {
      body: {
        refresh: secondRefresh.token.refresh,
      } satisfies IShoppingMallBuyer.IRefresh,
    });
  typia.assert(thirdRefresh);

  // Final validation of complete session integrity
  TestValidator.equals(
    "buyer ID remains constant through all refreshes",
    thirdRefresh.id,
    initialBuyerId,
  );
  TestValidator.equals(
    "buyer email remains constant through all refreshes",
    thirdRefresh.email,
    initialEmail,
  );
  TestValidator.equals(
    "buyer name remains constant through all refreshes",
    thirdRefresh.full_name,
    initialFullName,
  );
  TestValidator.equals(
    "created_at timestamp never changes",
    thirdRefresh.created_at,
    initialBuyer.created_at,
  );
}
