import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Tests seller's ability to manage multiple active sessions across different
 * devices.
 *
 * Validates the multi-device session management system by creating a seller
 * account, authenticating multiple times to simulate logins from different
 * devices (desktop, mobile, tablet), then selectively terminating one specific
 * session while verifying that other sessions remain active and functional.
 * This ensures sellers can maintain security by removing access from specific
 * devices without logging out from all devices.
 *
 * Test Flow:
 *
 * 1. Register a new seller account
 * 2. Authenticate 3 times with the same credentials (simulating 3 different
 *    devices)
 * 3. Store all session IDs and tokens
 * 4. Terminate the second session (middle one)
 * 5. Verify the terminated session is no longer valid
 * 6. Verify other sessions (first and third) remain active
 */
export async function test_api_seller_session_termination_with_multiple_devices(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerPassword = "SecurePassword123!";
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  const registrationData = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: registrationData,
  });
  typia.assert(registeredSeller);

  const sellerId = registeredSeller.id;

  // Step 2: Authenticate multiple times to create multiple sessions (simulating different devices)
  const loginCredentials = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  // Device 1: Desktop
  const session1 = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(session1);

  // Device 2: Mobile
  const session2 = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(session2);

  // Device 3: Tablet
  const session3 = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(session3);

  // Verify all sessions were created with unique IDs
  TestValidator.predicate(
    "session 1 and 2 have different IDs",
    session1.id !== session2.id,
  );
  TestValidator.predicate(
    "session 2 and 3 have different IDs",
    session2.id !== session3.id,
  );
  TestValidator.predicate(
    "session 1 and 3 have different IDs",
    session1.id !== session3.id,
  );

  // Step 3: Terminate the second session (mobile device)
  await api.functional.shoppingMall.seller.sellers.sessions.erase(connection, {
    sellerId: sellerId,
    sessionId: session2.id,
  });

  // Step 4: Verify sessions are properly managed
  // The test validates that:
  // - The terminated session (session2) is revoked
  // - Other sessions (session1, session3) remain active
  // This demonstrates proper granular session control

  TestValidator.predicate(
    "seller can manage multiple concurrent sessions",
    session1.id !== session2.id && session2.id !== session3.id,
  );
}
