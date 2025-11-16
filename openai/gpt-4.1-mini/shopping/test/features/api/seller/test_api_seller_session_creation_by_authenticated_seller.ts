import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * This E2E test validates the complete flow of creating a new seller session by
 * an authenticated seller user in the shopping mall system. The test includes:
 *
 * 1. Seller account registration via /auth/seller/join, which returns an
 *    authorized seller with a valid JWT token,
 * 2. Use the authorized seller's ID and authentication to create a seller session
 *    record at /shoppingMall/seller/sellers/{sellerId}/sellerSessions endpoint,
 *    supplying connection-related context like IP address, href, referrer,
 *    userAgent, and optional expiration timestamp,
 * 3. Verifying the response type and content correctness by asserting the returned
 *    session data fully matches the expected structure including seller ID, IP,
 *    href, referrer strings and ISO timestamp formats. Data is generated
 *    realistically using typia.random and RandomGenerator utilities. Important
 *    validation steps include checking that the seller ID in session matches
 *    the authorized user and all non-nullable fields are defined as expected.
 */
export async function test_api_seller_session_creation_by_authenticated_seller(
  connection: api.IConnection,
) {
  // Step 1: Register as a new seller by calling the seller join API
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ComplexPassw0rd!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(authorizedSeller);

  // Step 2: Use an authenticated session to create a new seller session record
  // Generate session creation payload
  const sessionCreateBody = {
    ip: typia.random<string>(),
    href: `https://${RandomGenerator.alphaNumeric(10)}.example.com/path`,
    referrer: `https://${RandomGenerator.alphaNumeric(15)}.example.com/ref`,
    userAgent: "Mozilla/5.0 (compatible; TestBot/1.0)",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // Expires in 1 hour
  } satisfies IShoppingMallSellerSession.ICreate;

  const session: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.sellers.sellerSessions.create(
      connection,
      {
        sellerId: authorizedSeller.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // Step 3: Validate properties of the returned session
  TestValidator.equals(
    "seller ID matches authorized seller",
    session.seller_id,
    authorizedSeller.id,
  );
  TestValidator.equals(
    "ip address matches request",
    session.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "href matches request",
    session.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "referrer matches request",
    session.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );
  if (session.expires_at !== null && session.expires_at !== undefined) {
    TestValidator.predicate(
      "expires_at is ISO 8601 string",
      typeof session.expires_at === "string" && session.expires_at.length > 0,
    );
  }
}
