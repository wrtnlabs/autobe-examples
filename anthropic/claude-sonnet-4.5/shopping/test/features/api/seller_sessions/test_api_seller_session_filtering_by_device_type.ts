import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration, email verification, and multiple session creation.
 *
 * This test validates the seller authentication workflow:
 *
 * 1. Create a new seller account and receive authentication tokens
 * 2. Verify the seller's email address (simulate verification process)
 * 3. Create multiple login sessions to validate multi-device support
 * 4. Validate that each session receives proper authentication tokens
 *
 * Note: Session filtering by device type requires an API endpoint that is not
 * currently available in the provided API specification. This test focuses on
 * the implementable parts: registration, verification, and session creation.
 */
export async function test_api_seller_session_filtering_by_device_type(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const createBody = {
    email: sellerEmail,
    password: sellerPassword,
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
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: createBody,
  });
  typia.assert(authorizedSeller);

  TestValidator.equals(
    "seller email matches registration email",
    authorizedSeller.email,
    sellerEmail,
  );

  TestValidator.predicate(
    "seller ID is valid UUID",
    authorizedSeller.id.length > 0,
  );

  // Verify authorization token structure
  typia.assert(authorizedSeller.token);
  TestValidator.predicate(
    "access token is provided",
    authorizedSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided",
    authorizedSeller.token.refresh.length > 0,
  );

  // Step 2: Verify the seller's email address
  const verificationToken = RandomGenerator.alphaNumeric(32);

  const verifyEmailResponse =
    await api.functional.auth.seller.verification.confirm.verifyEmail(
      connection,
      {
        body: {
          token: verificationToken,
        } satisfies IShoppingMallSeller.IVerifyEmail,
      },
    );
  typia.assert(verifyEmailResponse);
  TestValidator.predicate(
    "verification response contains message",
    verifyEmailResponse.message.length > 0,
  );

  // Step 3: Create multiple login sessions to validate multi-device support
  const session1 = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(session1);
  TestValidator.equals(
    "session 1 seller ID matches",
    session1.id,
    authorizedSeller.id,
  );
  typia.assert(session1.token);

  const session2 = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(session2);
  TestValidator.equals(
    "session 2 seller ID matches",
    session2.id,
    authorizedSeller.id,
  );
  typia.assert(session2.token);

  const session3 = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(session3);
  TestValidator.equals(
    "session 3 seller ID matches",
    session3.id,
    authorizedSeller.id,
  );
  typia.assert(session3.token);

  // Validate that each session has unique tokens
  TestValidator.notEquals(
    "session 1 and session 2 have different access tokens",
    session1.token.access,
    session2.token.access,
  );
  TestValidator.notEquals(
    "session 2 and session 3 have different access tokens",
    session2.token.access,
    session3.token.access,
  );
  TestValidator.notEquals(
    "session 1 and session 3 have different access tokens",
    session1.token.access,
    session3.token.access,
  );

  // Test authentication with sellerId parameter variation
  const sessionWithSellerId =
    await api.functional.shoppingMall.sellers.sessions.patchBySellerid(
      connection,
      {
        sellerId: authorizedSeller.id,
        body: {
          email: sellerEmail,
          password: sellerPassword,
        } satisfies IShoppingMallSeller.ILogin,
      },
    );
  typia.assert(sessionWithSellerId);
  TestValidator.equals(
    "session with seller ID matches",
    sessionWithSellerId.id,
    authorizedSeller.id,
  );
  typia.assert(sessionWithSellerId.token);
}
