import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test authorization isolation for seller session search endpoint.
 *
 * This test validates that sellers can only access their own session data and
 * cannot view sessions belonging to other sellers, ensuring proper security
 * boundaries between seller accounts.
 *
 * The test workflow:
 *
 * 1. Create Seller A and obtain authentication tokens
 * 2. Create Seller B and obtain authentication tokens
 * 3. Verify Seller A can query their own sessions successfully
 * 4. Verify Seller B can query their own sessions successfully
 * 5. Attempt unauthorized access: Seller A tries to query Seller B's sessions
 * 6. Verify the request fails with proper authorization error
 *
 * Security validation:
 *
 * - JWT token validation extracts authenticated seller ID
 * - Path parameter sellerId is compared against authenticated seller ID
 * - Mismatches are rejected before data retrieval
 * - No session data leakage occurs in error responses
 */
export async function test_api_seller_sessions_search_authorization_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create Seller A with authentication
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+82"),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerA);

  // Step 2: Create Seller B with authentication (using fresh connection to avoid header conflicts)
  const sellerBConnection: api.IConnection = { ...connection, headers: {} };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(sellerBConnection, {
      body: {
        email: sellerBEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+82"),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerB);

  // Step 3: Verify Seller A can query their own sessions successfully
  const sellerASessionsRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerSession.IRequest;

  const sellerASessions: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: sellerA.id,
        body: sellerASessionsRequest,
      },
    );
  typia.assert(sellerASessions);

  // Validate that Seller A has at least one session (from the join operation)
  TestValidator.predicate(
    "Seller A should have at least one session from registration",
    sellerASessions.data.length >= 1,
  );

  // Step 4: Verify Seller B can query their own sessions successfully
  const sellerBSessionsRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerSession.IRequest;

  const sellerBSessions: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      sellerBConnection,
      {
        sellerId: sellerB.id,
        body: sellerBSessionsRequest,
      },
    );
  typia.assert(sellerBSessions);

  // Validate that Seller B has at least one session (from the join operation)
  TestValidator.predicate(
    "Seller B should have at least one session from registration",
    sellerBSessions.data.length >= 1,
  );

  // Step 5: Attempt unauthorized access - Seller A tries to query Seller B's sessions
  // This should fail with authorization error
  await TestValidator.error(
    "Seller A should not be able to access Seller B's sessions",
    async () => {
      await api.functional.shoppingMall.seller.sellers.sessions.index(
        connection,
        {
          sellerId: sellerB.id,
          body: sellerASessionsRequest,
        },
      );
    },
  );
}
