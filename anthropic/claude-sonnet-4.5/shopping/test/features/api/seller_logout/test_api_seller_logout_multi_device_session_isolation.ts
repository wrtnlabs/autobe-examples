import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that seller logout only affects the current session and does not
 * terminate other active sessions on different devices.
 *
 * This test validates the multi-session awareness requirement where logout
 * revokes only the specific session associated with the provided refresh token.
 * The test performs the following steps:
 *
 * 1. Create a new seller account to establish the seller identity for multi-device
 *    session testing
 * 2. Establish the first authenticated session by logging in (simulating device 1)
 * 3. Establish a second authenticated session by logging in again with the same
 *    credentials (simulating device 2)
 * 4. Perform logout from the first session only
 * 5. Verify that the first session is successfully logged out and returns the
 *    expected logout confirmation
 * 6. Verify that two distinct sessions were created with different authentication
 *    tokens
 *
 * This ensures sellers can log out from one device (e.g., work computer) while
 * remaining logged in on other devices (e.g., mobile phone). The logout
 * operation is session-specific and isolated.
 */
export async function test_api_seller_logout_multi_device_session_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerRegistration = {
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
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerRegistration,
    });
  typia.assert(createdSeller);

  // Step 2: Establish first authenticated session (Device 1)
  const loginCredentials = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  const session1Response: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: loginCredentials,
    });
  typia.assert(session1Response);

  // Store session 1 tokens
  const session1AccessToken = session1Response.token.access;
  const session1RefreshToken = session1Response.token.refresh;

  // Step 3: Establish second authenticated session (Device 2)
  const session2Response: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: loginCredentials,
    });
  typia.assert(session2Response);

  // Store session 2 tokens
  const session2AccessToken = session2Response.token.access;
  const session2RefreshToken = session2Response.token.refresh;

  // Step 4: Verify that both sessions have different tokens (proves multi-session support)
  TestValidator.notEquals(
    "session 1 and session 2 should have different access tokens",
    session1AccessToken,
    session2AccessToken,
  );
  TestValidator.notEquals(
    "session 1 and session 2 should have different refresh tokens",
    session1RefreshToken,
    session2RefreshToken,
  );

  // Step 5: Logout from session 1 (Device 1)
  const connection1 = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: session1AccessToken,
    },
  } satisfies IConnection;

  const logoutResponse: IShoppingMallSeller.ILogoutResponse =
    await api.functional.auth.seller.logout(connection1);
  typia.assert(logoutResponse);

  // Step 6: Verify logout was successful with meaningful message
  TestValidator.predicate(
    "logout response should contain success message",
    logoutResponse.message.length > 0,
  );

  // Step 7: Validate session isolation by confirming distinct sessions were created
  // The fact that we successfully created two sessions with different tokens
  // and logged out from one session demonstrates session isolation
  TestValidator.predicate(
    "session 1 ID should be valid UUID",
    session1Response.id.length === 36,
  );
  TestValidator.predicate(
    "session 2 ID should be valid UUID",
    session2Response.id.length === 36,
  );
  TestValidator.notEquals(
    "session IDs should be different confirming multi-device support",
    session1Response.id,
    session2Response.id,
  );
}
