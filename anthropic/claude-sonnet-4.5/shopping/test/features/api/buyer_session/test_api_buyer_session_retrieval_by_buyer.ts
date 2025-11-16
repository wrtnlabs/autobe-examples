import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";

/**
 * Test buyer session retrieval functionality.
 *
 * This test validates a buyer's ability to retrieve detailed information about
 * their own authentication session. The workflow creates a buyer account
 * through join (which establishes an initial session), then retrieves and
 * validates the session details.
 *
 * Process:
 *
 * 1. Register new buyer account (creates buyer + initial session)
 * 2. Use simulation mode to retrieve session details
 * 3. Validate session data structure and completeness
 * 4. Verify session contains proper buyer reference and metadata
 * 5. Confirm session status indicates active state
 *
 * Note: Since the join response doesn't include the session ID and no session
 * listing endpoint is available, we use a generated session ID. In production,
 * the session ID would typically be available through the authentication token
 * or a separate endpoint.
 */
export async function test_api_buyer_session_retrieval_by_buyer(
  connection: api.IConnection,
) {
  // Step 1: Register a new buyer account and establish initial session
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerHref = typia.random<string & tags.Format<"uri">>();
  const buyerReferrer = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: buyerHref,
    referrer: buyerReferrer,
  } satisfies IShoppingMallBuyer.ICreate;

  const authorizedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedBuyer);

  // Step 2: Extract buyer ID from the join response
  const buyerId = authorizedBuyer.id;
  typia.assert<string & tags.Format<"uuid">>(buyerId);

  // Verify buyer account was created with correct data
  TestValidator.equals(
    "buyer email should match registration",
    authorizedBuyer.email,
    buyerEmail,
  );

  TestValidator.equals(
    "buyer full_name should match registration",
    authorizedBuyer.full_name,
    registrationData.full_name,
  );

  // Step 3: Generate a session ID for retrieval
  // Note: In a real scenario, this ID would come from the join response or a sessions list endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve the session information
  const session: IShoppingMallBuyerSession =
    await api.functional.shoppingMall.buyer.buyers.sessions.at(connection, {
      buyerId: buyerId,
      sessionId: sessionId,
    });
  typia.assert(session);

  // Step 5: Validate session data structure and completeness
  TestValidator.equals(
    "session should reference correct buyer",
    session.shopping_mall_buyer_id,
    buyerId,
  );

  // Validate all required session fields are present and properly formatted
  typia.assert<string & tags.Format<"uuid">>(session.id);
  typia.assert<string & tags.Format<"uuid">>(session.shopping_mall_buyer_id);
  typia.assert<string>(session.ip);
  typia.assert<string & tags.Format<"uri">>(session.href);
  typia.assert<string & tags.Format<"uri">>(session.referrer);
  typia.assert<string & tags.Format<"date-time">>(session.created_at);

  // Step 6: Validate that the session is active (not expired)
  TestValidator.predicate(
    "active session should have null or undefined expired_at",
    session.expired_at === null || session.expired_at === undefined,
  );

  // Step 7: Validate created_at is a valid ISO 8601 timestamp
  const createdAt = new Date(session.created_at);
  TestValidator.predicate(
    "session created_at should be valid date",
    !isNaN(createdAt.getTime()),
  );
}
