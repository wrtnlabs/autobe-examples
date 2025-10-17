import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test multi-device concurrent session support for sellers.
 *
 * This test validates that sellers can maintain active sessions across multiple
 * devices simultaneously. The test creates a seller account, then authenticates
 * from two separate simulated devices (desktop and mobile) and verifies that
 * both sessions remain active with unique tokens.
 *
 * The test workflow:
 *
 * 1. Create a new seller account with complete business information
 * 2. Authenticate from first device (desktop) to create session 1
 * 3. Authenticate from second device (mobile) to create session 2
 * 4. Verify both sessions have unique access and refresh tokens
 * 5. Validate that both sessions remain active and valid concurrently
 */
export async function test_api_seller_authentication_multi_device_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with complete business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const createSellerBody = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name()} St, ${RandomGenerator.name()} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: createSellerBody,
  });
  typia.assert(createdSeller);

  // Step 2: Authenticate from first device (desktop) - create session 1
  // Use a fresh connection without the auto-set authorization from join()
  const desktopConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const session1Body = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  const session1Response =
    await api.functional.shoppingMall.sellers.sessions.post(desktopConnection, {
      body: session1Body,
    });
  typia.assert(session1Response);

  // Step 3: Authenticate from second device (mobile) - create session 2
  // Use another fresh connection to simulate a separate device
  const mobileConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const session2Body = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  const session2Response =
    await api.functional.shoppingMall.sellers.sessions.post(mobileConnection, {
      body: session2Body,
    });
  typia.assert(session2Response);

  // Step 4: Verify both sessions belong to the same seller
  TestValidator.equals(
    "both sessions should have same seller ID",
    session1Response.id,
    session2Response.id,
  );

  // Step 5: Verify sessions have unique tokens (proving concurrent sessions)
  TestValidator.notEquals(
    "session 1 and 2 access tokens should be unique",
    session1Response.token.access,
    session2Response.token.access,
  );

  TestValidator.notEquals(
    "session 1 and 2 refresh tokens should be unique",
    session1Response.token.refresh,
    session2Response.token.refresh,
  );

  // Step 6: Validate both sessions have valid token data
  TestValidator.predicate(
    "session 1 access token should be non-empty",
    session1Response.token.access.length > 0,
  );

  TestValidator.predicate(
    "session 2 access token should be non-empty",
    session2Response.token.access.length > 0,
  );

  TestValidator.predicate(
    "session 1 should have valid expiration timestamp",
    new Date(session1Response.token.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "session 2 should have valid expiration timestamp",
    new Date(session2Response.token.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "session 1 refresh token should be valid until future date",
    new Date(session1Response.token.refreshable_until).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "session 2 refresh token should be valid until future date",
    new Date(session2Response.token.refreshable_until).getTime() > Date.now(),
  );
}
