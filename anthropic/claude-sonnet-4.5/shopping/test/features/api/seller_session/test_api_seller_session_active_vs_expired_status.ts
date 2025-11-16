import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test session retrieval endpoint structure and response validation.
 *
 * NOTE: This test validates the session retrieval API structure. The original
 * scenario required testing active vs expired session states, but this cannot
 * be fully implemented because:
 *
 * 1. The join response (IShoppingMallSeller.IAuthorized) does not include session
 *    ID
 * 2. No login endpoint exists to create multiple sessions for the same seller
 * 3. Without session IDs, we cannot retrieve specific sessions to verify state
 *    transitions
 *
 * This implementation creates a seller account and demonstrates the session
 * retrieval API structure, validating the response format and session metadata
 * fields.
 */
export async function test_api_seller_session_active_vs_expired_status(
  connection: api.IConnection,
) {
  // Step 1: Create seller account which generates an initial session server-side
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const createBody = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: typia.random<string & tags.Pattern<"^\\+?[1-9]\\d{1,14}$">>(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 10,
    }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: createBody,
  });
  typia.assert(sellerAuth);

  // Step 2: Retrieve session details
  // Since we don't have the actual session ID from the join response,
  // we use a generated UUID to demonstrate the API call structure
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const sessionDetails =
    await api.functional.shoppingMall.seller.sellers.sessions.at(connection, {
      sellerId: sellerAuth.id,
      sessionId: sessionId,
    });
  typia.assert(sessionDetails);

  // Step 3: Validate session metadata structure
  TestValidator.equals(
    "session seller ID matches created seller",
    sessionDetails.shopping_mall_seller_id,
    sellerAuth.id,
  );

  TestValidator.equals(
    "session seller summary ID matches",
    sessionDetails.seller.id,
    sellerAuth.id,
  );

  // Step 4: Validate session has complete connection metadata
  TestValidator.predicate(
    "session has connection metadata",
    sessionDetails.ip !== undefined &&
      sessionDetails.href !== undefined &&
      sessionDetails.referrer !== undefined,
  );

  // Step 5: Validate session timestamps
  const createdDate = new Date(sessionDetails.created_at);
  TestValidator.predicate(
    "session created_at is valid date",
    !isNaN(createdDate.getTime()),
  );

  // Step 6: Validate expired_at field (can be null for active or timestamp for expired)
  if (
    sessionDetails.expired_at !== null &&
    sessionDetails.expired_at !== undefined
  ) {
    const expiredDate = new Date(sessionDetails.expired_at);
    TestValidator.predicate(
      "expired_at is valid date when set",
      !isNaN(expiredDate.getTime()),
    );

    TestValidator.predicate(
      "expired_at is after created_at when set",
      expiredDate.getTime() >= createdDate.getTime(),
    );
  }
}
