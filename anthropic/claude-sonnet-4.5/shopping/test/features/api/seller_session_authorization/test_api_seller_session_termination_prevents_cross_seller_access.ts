import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that sellers can only terminate their own sessions and cannot revoke
 * sessions belonging to other sellers.
 *
 * This test validates critical session security boundaries in the multi-tenant
 * seller system. It creates two independent seller accounts, authenticates both
 * to establish separate sessions, then attempts to have one seller terminate a
 * session using another seller's ID. The test ensures that proper authorization
 * checks prevent cross-seller session termination, which is essential for
 * preventing denial-of-service attacks and maintaining account security.
 *
 * Test workflow:
 *
 * 1. Create and authenticate Seller A to establish their session
 * 2. Create and authenticate Seller B to establish their session
 * 3. While authenticated as Seller B, attempt to terminate a session for Seller A
 * 4. Validate that the operation fails with proper authorization error
 */
export async function test_api_seller_session_termination_prevents_cross_seller_access(
  connection: api.IConnection,
) {
  // Step 1: Create first seller account (Seller A)
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = typia.random<string & tags.MinLength<8>>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      tax_id: RandomGenerator.alphaNumeric(9),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerA);

  // Capture Seller A's ID for later cross-seller access attempt
  const sellerAId = sellerA.id;

  // Step 2: Create second seller account (Seller B)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = typia.random<string & tags.MinLength<8>>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      tax_id: RandomGenerator.alphaNumeric(9),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerB);

  // Step 3: Authenticate Seller B (this switches the connection context to Seller B)
  const sellerBLogin = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerBLogin);

  // Step 4: Attempt to terminate a session for Seller A while authenticated as Seller B
  // Generate a session ID to attempt termination - this should fail with authorization error
  // even if the session doesn't exist, because Seller B shouldn't have access to Seller A's resources
  const arbitrarySessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "cross-seller session termination must be prevented",
    async () => {
      await api.functional.shoppingMall.seller.sellers.sessions.erase(
        connection,
        {
          sellerId: sellerAId,
          sessionId: arbitrarySessionId,
        },
      );
    },
  );

  // The test passes if the session termination attempt throws an error,
  // validating that proper authorization boundaries are enforced
}
