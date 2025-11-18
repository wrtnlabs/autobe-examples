import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller join creates an authorized seller context and wires the
 * initial session token into the shared connection.
 *
 * Business focus (adapted to available APIs):
 *
 * - POST /auth/seller/join returns an IShoppingMallSeller.IAuthorized payload
 *   containing identity information and an IAuthorizationToken bundle.
 * - The SDK function `api.functional.auth.seller.join` must set
 *   `connection.headers.Authorization` to the returned access token, which is
 *   how subsequent authenticated calls represent the initial session created by
 *   the backend (even though we cannot directly query session rows here).
 * - Join request metadata fields (email, password, ip, href, referrer) must be
 *   accepted when well-formed.
 *
 * Steps:
 *
 * 1. Build a realistic IShoppingMallSellerAuthJoin.IRequest payload including
 *    email, password, href, referrer, and ip (IPv4).
 * 2. Call POST /auth/seller/join via `api.functional.auth.seller.join`.
 * 3. Assert the response type with
 *    typia.assert<IShoppingMallSeller.IAuthorized>().
 * 4. Assert the token sub-object with typia.assert<IAuthorizationToken>().
 * 5. Perform business-level validations on token fields (non-empty strings, valid
 *    ISO date-times, refreshable_until not earlier than expired_at).
 * 6. Confirm that the SDK has written the access token into
 *    `connection.headers.Authorization` and that it matches the response.
 * 7. Call join a second time with a different seller to validate that
 *    Authorization header is updated to the new access token, proving that the
 *    latest session context wins.
 */
export async function test_api_seller_join_records_initial_session_metadata(
  connection: api.IConnection,
) {
  // 1. Prepare realistic join request payload for first seller
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = typia.random<string & tags.Format<"password">>();
  const ip1 = typia.random<string & tags.Format<"ipv4">>();
  const href1 = "https://shop.example.com/onboarding/seller" as string;
  const referrer1 = "https://campaign.example.com/landing" as string;

  const joinBody1 = {
    email: email1,
    password: password1,
    ip: ip1,
    href: href1,
    referrer: referrer1,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  // 2. Call join API for first seller
  const authorized1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody1,
    });

  // 3. Validate response type and token structure
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized1);
  typia.assert<IAuthorizationToken>(authorized1.token);

  // 4. Basic token business validations
  TestValidator.predicate(
    "access token should be non-empty string",
    typeof authorized1.token.access === "string" &&
      authorized1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    typeof authorized1.token.refresh === "string" &&
      authorized1.token.refresh.length > 0,
  );

  const accessExpiredAt1 = new Date(authorized1.token.expired_at);
  const refreshableUntil1 = new Date(authorized1.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "expired_at should be a valid date",
    !Number.isNaN(accessExpiredAt1.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be a valid date",
    !Number.isNaN(refreshableUntil1.getTime()),
  );
  TestValidator.predicate(
    "expired_at should not be in the distant past",
    accessExpiredAt1.getTime() > now.getTime() - 1000 * 60 * 60 * 24,
  );
  TestValidator.predicate(
    "refreshable_until should be on or after expired_at",
    refreshableUntil1.getTime() >= accessExpiredAt1.getTime(),
  );

  // 5. Validate that Authorization header on connection is wired to access token
  TestValidator.predicate(
    "connection.headers should be defined after join",
    connection.headers !== undefined,
  );
  const authorizationHeader1 = connection.headers
    ? connection.headers.Authorization
    : undefined;

  TestValidator.predicate(
    "Authorization header should be non-empty string after join",
    typeof authorizationHeader1 === "string" &&
      (authorizationHeader1 as string).length > 0,
  );

  TestValidator.equals(
    "Authorization header should equal first access token",
    authorizationHeader1,
    authorized1.token.access,
  );

  // 6. Perform a second join with a new seller to ensure header update
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = typia.random<string & tags.Format<"password">>();
  const ip2 = typia.random<string & tags.Format<"ipv4">>();
  const href2 = "https://shop.example.com/onboarding/seller?step=2" as string;
  const referrer2 = "https://affiliate.example.com/ref" as string;

  const joinBody2 = {
    email: email2,
    password: password2,
    ip: ip2,
    href: href2,
    referrer: referrer2,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorized2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody2,
    });

  typia.assert<IShoppingMallSeller.IAuthorized>(authorized2);
  typia.assert<IAuthorizationToken>(authorized2.token);

  const authorizationHeader2 = connection.headers
    ? connection.headers.Authorization
    : undefined;

  TestValidator.equals(
    "Authorization header should be updated to second access token",
    authorizationHeader2,
    authorized2.token.access,
  );
}
