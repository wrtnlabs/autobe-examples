import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";

/**
 * Test buyer's ability to retrieve session information after authenticating
 * through login operation.
 *
 * This test validates the common scenario of returning users who authenticate
 * via login rather than join. It creates a buyer account first, then performs a
 * login operation which creates a new session.
 *
 * Note: The current API design does not return session ID in the login
 * response, so we use a randomly generated session ID to demonstrate the
 * session retrieval flow. In a real scenario, the session ID would need to be
 * obtained through another mechanism.
 *
 * Step-by-step process:
 *
 * 1. Create buyer account through join operation
 * 2. Authenticate buyer using login operation (creates new session)
 * 3. Retrieve session details using the session retrieval endpoint
 * 4. Validate session properties match login context
 * 5. Verify session is active (expired_at is null)
 */
export async function test_api_buyer_session_retrieval_after_login(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account through join
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();

  const joinedBuyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: joinHref,
      referrer: joinReferrer,
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(joinedBuyer);

  // Step 2: Authenticate the buyer using login operation (creates a NEW session)
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();
  const loginTimeBefore = new Date().toISOString();

  const loggedInBuyer = await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies IShoppingMallBuyer.ILogin,
  });
  typia.assert(loggedInBuyer);

  const loginTimeAfter = new Date().toISOString();

  // Step 3: Retrieve session details
  // Note: Using a random session ID as a placeholder since the login response
  // doesn't include the session ID. In a production test, this would need to be
  // obtained through a session listing endpoint or included in the login response.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const retrievedSession =
    await api.functional.shoppingMall.buyer.buyers.sessions.at(connection, {
      buyerId: loggedInBuyer.id,
      sessionId: sessionId,
    });
  typia.assert(retrievedSession);

  // Step 4: Validate session properties
  TestValidator.equals(
    "retrieved session buyer ID matches logged in buyer",
    retrievedSession.shopping_mall_buyer_id,
    loggedInBuyer.id,
  );

  TestValidator.equals(
    "session href matches login href",
    retrievedSession.href,
    loginHref,
  );

  TestValidator.equals(
    "session referrer matches login referrer",
    retrievedSession.referrer,
    loginReferrer,
  );

  // Step 5: Verify session is active (expired_at should be null)
  TestValidator.equals(
    "session is active with null expired_at",
    retrievedSession.expired_at,
    null,
  );

  // Verify created_at timestamp is within the login time window
  TestValidator.predicate(
    "session created_at is within login time range",
    retrievedSession.created_at >= loginTimeBefore &&
      retrievedSession.created_at <= loginTimeAfter,
  );
}
