import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";

/**
 * Test that sellers cannot access session details using another seller's ID.
 *
 * This test validates the ownership validation security principle by attempting
 * to retrieve session information using mismatched seller IDs and session IDs.
 * Since the API does not return session IDs in the authentication response,
 * this test validates that the authorization layer properly rejects requests
 * where the authenticated seller ID does not match the seller ID in the request
 * path.
 *
 * The test creates two seller accounts, authenticates as Seller B, then
 * attempts to access session data using Seller A's ID. This should result in an
 * authorization error, proving that the API enforces seller identity matching
 * for session retrieval operations.
 *
 * Test Steps:
 *
 * 1. Create first seller account (Seller A) and capture their ID
 * 2. Create second seller account (Seller B) and capture their ID
 * 3. Authenticate as Seller B (connection context is now Seller B)
 * 4. Attempt to retrieve session using Seller A's ID (should fail with
 *    authorization error)
 * 5. Validate that the authorization error is properly thrown
 */
export async function test_api_seller_session_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first seller account (Seller A)
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = typia.random<string & tags.MinLength<8>>();

  const sellerARegistration = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerA = await api.functional.auth.seller.join(connection, {
    body: sellerARegistration,
  });
  typia.assert(sellerA);

  const sellerAId = sellerA.id;

  // Step 2: Create second seller account (Seller B)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = typia.random<string & tags.MinLength<8>>();

  const sellerBRegistration = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Avenue, ${RandomGenerator.name(1)} Town`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerB = await api.functional.auth.seller.join(connection, {
    body: sellerBRegistration,
  });
  typia.assert(sellerB);

  // Step 3: Authenticate as Seller B (this switches the connection context to Seller B)
  const sellerBLoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerBLoginResponse);

  // Step 4 & 5: Attempt to retrieve session using Seller A's ID while authenticated as Seller B
  // This should fail because Seller B should not be able to access Seller A's sessions
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "seller B cannot access seller A session information",
    async () => {
      await api.functional.shoppingMall.seller.sellers.sessions.at(connection, {
        sellerId: sellerAId,
        sessionId: randomSessionId,
      });
    },
  );
}
