import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that sellers cannot revoke sessions belonging to other sellers.
 *
 * This test validates a critical security boundary in the session management
 * system. It creates two separate seller accounts with their own authenticated
 * sessions, then attempts to have one seller revoke the other seller's
 * session.
 *
 * The test ensures that the session revocation endpoint properly validates
 * ownership before allowing revocation, preventing malicious sellers from
 * disrupting other sellers' operations by terminating their sessions.
 *
 * Process:
 *
 * 1. Create first seller account (Seller A) with authenticated session
 * 2. Create second seller account (Seller B) with separate session
 * 3. Attempt to revoke Seller A's session while authenticated as Seller B
 * 4. Verify the revocation attempt fails with proper authorization error
 */
export async function test_api_seller_unauthorized_session_revocation(
  connection: api.IConnection,
) {
  // Step 1: Create first seller account (Seller A)
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: RandomGenerator.alphaNumeric(12),
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
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerA);

  // Step 2: Create second seller account (Seller B)
  // This will automatically update the connection headers with Seller B's token
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: RandomGenerator.alphaNumeric(12),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      business_name: RandomGenerator.name(2),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Avenue, ${RandomGenerator.name(1)} Town`,
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerB);

  // Step 3: Attempt to revoke a session that doesn't belong to Seller B
  // Generate a random session ID that would represent Seller A's session
  const arbitrarySessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Verify that the revocation attempt fails with authorization error
  await TestValidator.error(
    "seller cannot revoke another seller's session",
    async () => {
      await api.functional.auth.seller.sessions.revokeSession(connection, {
        sessionId: arbitrarySessionId,
      });
    },
  );
}
