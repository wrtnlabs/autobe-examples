import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that a seller can successfully log in with valid credentials.
 *
 * Scenario:
 *
 * 1. Register a new seller through /auth/seller/join with known email and
 *    password, providing realistic href and referrer URLs and omitting ip to
 *    let server infer it.
 * 2. Call /auth/seller/login with the same email and plaintext password but a
 *    different set of href/referrer/ip values using
 *    IShoppingMallSellerAuthLogin.IRequest.
 * 3. Ensure the login succeeds by validating that the response conforms to
 *    IShoppingMallSeller.IAuthorized via typia.assert.
 * 4. Perform business-level checks:
 *
 *    - Email in the response equals the login email
 *    - Status is a non-empty string
 *    - Created_at and updated_at are valid ISO date-time strings
 *    - Deleted_at is null or undefined for this fresh account
 *    - Token.access and token.refresh are non-empty strings
 *    - Token.expired_at and token.refreshable_until are in the future
 * 5. Confirm that profile, when present, structurally matches
 *    IShoppingMallSellerProfile via typia.assert and that its
 *    shopping_mall_seller_id matches the seller id.
 * 6. Additionally verify that the access token returned from login differs from
 *    the initial token issued at join, ensuring a fresh token is issued.
 */
export async function test_api_seller_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new seller with known credentials using /auth/seller/join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinRequestBody = {
    email,
    password,
    // Let the server infer IP for the join; explicitly provide href/referrer
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(joinedSeller);

  // Capture the access token from join to compare later
  const initialAccessToken: string = joinedSeller.token.access;

  // Basic sanity checks on the joined seller
  TestValidator.equals(
    "joined seller email matches join request email",
    joinedSeller.email,
    email,
  );
  TestValidator.predicate(
    "joined seller status should be non-empty string",
    joinedSeller.status.length > 0,
  );

  // 2. Login with the same credentials using /auth/seller/login
  const loginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // For ip, use a realistic IPv4 string
  const loginIp: string = "192.168.0.1";

  const loginRequestBody = {
    email,
    password,
    ip: loginIp,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(loggedInSeller);

  // 3. Business-level validations on the login response
  TestValidator.equals(
    "logged-in seller id should match joined seller id",
    loggedInSeller.id,
    joinedSeller.id,
  );
  TestValidator.equals(
    "logged-in seller email should match login email",
    loggedInSeller.email,
    email,
  );
  TestValidator.predicate(
    "logged-in seller status should be non-empty string",
    loggedInSeller.status.length > 0,
  );
  TestValidator.predicate(
    "email_verified flag is boolean",
    typeof loggedInSeller.email_verified === "boolean",
  );

  // Validate created_at and updated_at are well-formed date-time strings by
  // attempting Date construction and checking for validity
  const createdAtDate = new Date(loggedInSeller.created_at);
  const updatedAtDate = new Date(loggedInSeller.updated_at);

  TestValidator.predicate(
    "created_at should be a valid date-time string",
    !isNaN(createdAtDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a valid date-time string",
    !isNaN(updatedAtDate.getTime()),
  );

  // Freshly created accounts should not be soft-deleted
  TestValidator.equals(
    "deleted_at should be null or undefined for active seller",
    loggedInSeller.deleted_at ?? null,
    null,
  );

  // 4. Token validation: structure already asserted by typia.assert, now do
  // simple business-level checks
  const token: IAuthorizationToken = loggedInSeller.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token should be non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    token.refresh.length > 0,
  );

  const now = Date.now();
  const expiredAtTime = new Date(token.expired_at).getTime();
  const refreshableUntilTime = new Date(token.refreshable_until).getTime();

  TestValidator.predicate(
    "access token expiration should be a valid future timestamp",
    !isNaN(expiredAtTime) && expiredAtTime > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be a valid future timestamp",
    !isNaN(refreshableUntilTime) && refreshableUntilTime >= expiredAtTime,
  );

  // 5. Profile validation when present: structural match and seller linkage
  if (loggedInSeller.profile !== undefined && loggedInSeller.profile !== null) {
    typia.assert<IShoppingMallSellerProfile>(loggedInSeller.profile);
    TestValidator.equals(
      "seller profile's owner id should match seller id",
      loggedInSeller.profile.shopping_mall_seller_id,
      loggedInSeller.id,
    );
  }

  // 6. Verify that a fresh token is issued on login compared to join
  TestValidator.notEquals(
    "new access token after login should differ from initial join token",
    token.access,
    initialAccessToken,
  );
}
