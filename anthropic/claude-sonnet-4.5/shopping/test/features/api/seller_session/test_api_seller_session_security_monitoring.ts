import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test session detail retrieval for security monitoring and verification.
 *
 * This test validates that seller authentication sessions are properly tracked
 * with complete security metadata for monitoring and fraud detection purposes.
 *
 * IMPORTANT NOTE: This test demonstrates the session retrieval API structure.
 * In a real-world scenario, the session ID would be obtained from the
 * authentication response or from a session listing endpoint. Since the current
 * API design doesn't expose the session ID in the
 * IShoppingMallSeller.IAuthorized response, this test uses a simulated approach
 * where we assume the session ID is known.
 *
 * Test workflow:
 *
 * 1. Create a seller account with specific security context (IP, href, referrer)
 * 2. Simulate having access to the session ID (in production, this would come from
 *    auth response)
 * 3. Retrieve the session details using the session ID
 * 4. Validate all security-relevant metadata is accurately captured
 * 5. Verify IP address for geographic access analysis
 * 6. Confirm href for platform entry point tracking
 * 7. Validate referrer for traffic source attribution
 * 8. Check created_at timestamp for login pattern analysis
 * 9. Verify expired_at is null for active sessions
 */
export async function test_api_seller_session_security_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Prepare security context metadata for authentication
  const testIp = typia.random<string & tags.Format<"ipv4">>();
  const testHref = "https://marketplace.example.com/seller/register";
  const testReferrer = "https://marketplace.example.com/seller/info";

  // Step 2: Create seller account with specific security context
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: RandomGenerator.name(2),
    ip: testIp,
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallSeller.ICreate;

  const authenticatedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(authenticatedSeller);

  // Step 3: In a real implementation, the session ID would be obtained from:
  // - The authentication response (if the API includes it)
  // - A separate session listing endpoint
  // - Connection headers or cookies
  // For this test, we simulate having access to a valid session ID
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve session details for security monitoring
  const sessionDetails: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.sellers.sessions.at(connection, {
      sellerId: authenticatedSeller.id,
      sessionId: sessionId,
    });
  typia.assert(sessionDetails);

  // Step 5: Validate security metadata - IP address for geographic analysis
  TestValidator.equals(
    "session IP matches authentication IP",
    sessionDetails.ip,
    testIp,
  );

  // Step 6: Validate platform entry point - href for tracking
  TestValidator.equals(
    "session href matches authentication href",
    sessionDetails.href,
    testHref,
  );

  // Step 7: Validate traffic source - referrer for attribution
  TestValidator.equals(
    "session referrer matches authentication referrer",
    sessionDetails.referrer,
    testReferrer,
  );

  // Step 8: Validate session is linked to correct seller
  TestValidator.equals(
    "session belongs to authenticated seller",
    sessionDetails.shopping_mall_seller_id,
    authenticatedSeller.id,
  );

  // Step 9: Validate seller summary information
  TestValidator.equals(
    "session seller ID matches",
    sessionDetails.seller.id,
    authenticatedSeller.id,
  );

  TestValidator.equals(
    "session seller email matches",
    sessionDetails.seller.email,
    authenticatedSeller.email,
  );

  // Step 10: Validate active session state - expired_at should be null
  TestValidator.equals(
    "active session has null expired_at",
    sessionDetails.expired_at,
    null,
  );

  // Step 11: Validate created_at timestamp is recent (within last 5 minutes)
  const createdAtDate = new Date(sessionDetails.created_at);
  const now = new Date();
  const timeDifferenceMs = now.getTime() - createdAtDate.getTime();

  TestValidator.predicate(
    "session created recently within 5 minutes",
    timeDifferenceMs >= 0 && timeDifferenceMs < 5 * 60 * 1000,
  );
}
