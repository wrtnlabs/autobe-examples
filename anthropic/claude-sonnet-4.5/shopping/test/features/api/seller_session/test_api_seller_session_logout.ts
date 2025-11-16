import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test seller authentication session logout functionality.
 *
 * This test validates the seller session termination endpoint by creating a
 * seller account and then testing the session deletion API. Since the session
 * ID is not exposed in the authentication response, this test validates the
 * API's behavior and response structure when attempting session termination.
 *
 * Process:
 *
 * 1. Create a new seller account through registration
 * 2. Verify successful authentication with JWT tokens
 * 3. Test the session termination endpoint with proper parameters
 * 4. Validate the API response structure and data integrity
 */
export async function test_api_seller_session_logout(
  connection: api.IConnection,
) {
  // Step 1: Create seller registration data with all required fields
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
    phone_number: typia.random<string & tags.Pattern<"^\\+?[1-9]\\d{1,14}$">>(),
    business_name: typia.random<
      string & tags.MinLength<2> & tags.MaxLength<200>
    >(),
    business_description: typia.random<string & tags.MaxLength<2000>>(),
    store_name: typia.random<
      string & tags.MinLength<2> & tags.MaxLength<100>
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  // Step 2: Register seller account and receive authenticated response
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedSeller);

  // Step 3: Verify the seller was successfully created and authenticated
  TestValidator.equals(
    "seller email matches registration",
    authorizedSeller.email,
    registrationData.email,
  );
  TestValidator.equals(
    "seller store name matches",
    authorizedSeller.store_name,
    registrationData.store_name,
  );
  TestValidator.predicate(
    "seller has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedSeller.id,
    ),
  );
  TestValidator.predicate(
    "access token exists",
    authorizedSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorizedSeller.token.refresh.length > 0,
  );

  // Step 4: Extract seller ID for session operations
  const sellerId = authorizedSeller.id;

  // Step 5: Generate a valid session ID for testing the logout endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 6: Test the session termination endpoint
  // Note: This tests the API contract and response structure
  const terminatedSession: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.sellers.sessions.erase(
      connection,
      {
        sellerId: sellerId,
        sessionId: sessionId,
      },
    );
  typia.assert(terminatedSession);

  // Step 7: Validate the session termination response structure
  TestValidator.predicate(
    "session has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      terminatedSession.id,
    ),
  );
  TestValidator.predicate(
    "session has seller reference",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      terminatedSession.shopping_mall_seller_id,
    ),
  );
  TestValidator.predicate(
    "session has IP address",
    terminatedSession.ip.length > 0,
  );
  TestValidator.predicate(
    "session has created timestamp",
    terminatedSession.created_at.length > 0,
  );
}
