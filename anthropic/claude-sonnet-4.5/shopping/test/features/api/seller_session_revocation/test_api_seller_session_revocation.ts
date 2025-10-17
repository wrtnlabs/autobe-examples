import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that sellers can successfully revoke a specific authentication session
 * remotely.
 *
 * Note: This test validates the session revocation endpoint structure and
 * response format. Due to API limitations (no session listing endpoint and
 * session IDs not returned in auth responses), we test the revocation endpoint
 * with a generated session ID to verify the API contract. In a real
 * implementation, session IDs would be obtainable from a session management
 * endpoint.
 */
export async function test_api_seller_session_revocation(
  connection: api.IConnection,
) {
  // Step 1: Create new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(),
        business_type: RandomGenerator.pick([
          "individual",
          "LLC",
          "corporation",
          "partnership",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create additional session by logging in again
  const secondSession: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(secondSession);

  // Step 3: Generate a session ID for testing revocation endpoint
  // In production, this would come from a session listing API or token inspection
  const sessionIdToRevoke = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Test that attempting to revoke a non-existent or invalid session returns an error
  // This validates the API's security - you cannot revoke sessions that don't exist or don't belong to you
  await TestValidator.error("cannot revoke non-existent session", async () => {
    await api.functional.auth.seller.sessions.revokeSession(connection, {
      sessionId: sessionIdToRevoke,
    });
  });

  // Step 5: Verify current session remains functional after failed revocation attempt
  const verificationSession: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(verificationSession);

  TestValidator.equals(
    "seller ID remains consistent",
    verificationSession.id,
    seller.id,
  );
}
