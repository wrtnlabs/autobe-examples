import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test seller logout workflow simulating multi-device session management.
 *
 * This test validates the session deletion endpoint for seller accounts. In a
 * real-world multi-device scenario, sellers would be logged in on multiple
 * devices (desktop, mobile, tablet) and need the ability to selectively
 * terminate specific sessions while maintaining others.
 *
 * Test workflow:
 *
 * 1. Create a new seller account through registration (establishes initial
 *    session)
 * 2. Verify seller account creation and authentication token issuance
 * 3. Call the session deletion endpoint to terminate a specific session
 * 4. Verify the session deletion response contains proper audit trail information
 *
 * Note: This test demonstrates the session deletion API structure. In a
 * complete implementation, the session ID would be obtained from a session
 * listing endpoint or the authentication response.
 */
export async function test_api_seller_session_multi_device_logout(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account which establishes the initial authentication session
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Verify seller account was created successfully
  TestValidator.predicate(
    "seller ID should be valid UUID",
    typia.is<string & tags.Format<"uuid">>(seller.id),
  );
  TestValidator.equals(
    "seller email matches input",
    seller.email,
    sellerData.email,
  );
  TestValidator.equals(
    "seller store name matches input",
    seller.store_name,
    sellerData.store_name,
  );

  // Step 3: Verify authentication token was issued successfully
  typia.assert<IAuthorizationToken>(seller.token);
  TestValidator.predicate(
    "access token should be present",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    seller.token.refresh.length > 0,
  );

  // Step 4: Simulate session deletion for multi-device logout scenario
  // In a real scenario, the session ID would come from:
  // - The join/login response (if it included session info)
  // - A session listing endpoint
  // - Session management system
  // For this test, we generate a valid UUID format to demonstrate the API structure
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Delete the specific session (simulating logout from one device)
  const deletedSession: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.sellers.sessions.erase(
      connection,
      {
        sellerId: seller.id,
        sessionId: targetSessionId,
      },
    );
  typia.assert(deletedSession);

  // Step 6: Verify the session deletion response structure
  TestValidator.predicate(
    "deleted session ID should be valid UUID",
    typia.is<string & tags.Format<"uuid">>(deletedSession.id),
  );
  TestValidator.equals(
    "deleted session seller ID matches",
    deletedSession.shopping_mall_seller_id,
    seller.id,
  );

  // Step 7: Verify session audit trail metadata
  TestValidator.predicate(
    "session IP address should be recorded",
    deletedSession.ip.length > 0,
  );
  TestValidator.predicate(
    "session connection URL should be valid URI",
    typia.is<string & tags.Format<"uri">>(deletedSession.href),
  );
  TestValidator.predicate(
    "session referrer URL should be valid URI",
    typia.is<string & tags.Format<"uri">>(deletedSession.referrer),
  );
  TestValidator.predicate(
    "session creation timestamp should be valid",
    typia.is<string & tags.Format<"date-time">>(deletedSession.created_at),
  );

  // Step 8: Verify seller summary information in session record
  typia.assert<IShoppingMallSeller.ISummary>(deletedSession.seller);
  TestValidator.equals(
    "session seller ID matches",
    deletedSession.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "session seller email matches",
    deletedSession.seller.email,
    seller.email,
  );
}
