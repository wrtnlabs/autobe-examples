import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validates seller JWT token refresh operation with a valid refresh token.
 *
 * This test simulates the complete workflow of a seller requesting new
 * authentication tokens using a valid (non-expired) refresh token. It ensures
 * that a new access and refresh token are issued, the session state is updated,
 * and the new tokens differ from the previous tokens. The steps are as
 * follows:
 *
 * 1. Register a new seller account and obtain the initial token.
 * 2. Log in with the seller credentials to get an up-to-date valid refresh token.
 * 3. Perform a token refresh using the valid refresh token.
 * 4. Assert that new tokens are issued and session metadata is correctly rotated.
 * 5. Confirm the issued tokens have correct formats and valid expiration
 *    timestamps.
 */
export async function test_api_seller_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new seller and get initial authorized output (contains a token)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const contactPhone = RandomGenerator.mobile();
  const joinBody = {
    email,
    password,
    display_name: displayName,
    contact_phone: contactPhone,
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const initialAuth: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(initialAuth);

  // 2. Log in to get fresh authorized output and refresh token
  const loginBody = {
    email,
    password,
    href: "https://seller-portal.example.com/login",
    referrer: "https://seller-portal.example.com/",
  } satisfies IShoppingSeller.ILogin;
  const loginAuth: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuth);
  TestValidator.equals(
    "Login output email matches registered email",
    loginAuth.email,
    email,
  );
  TestValidator.equals(
    "Login output id matches join output id",
    loginAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "Login output status is pending",
    loginAuth.status,
    "pending",
  );
  TestValidator.equals(
    "Login output account is active",
    loginAuth.is_active,
    initialAuth.is_active,
  );

  // Save previous tokens for validation
  const prevAccess: string = loginAuth.token.access;
  const prevRefresh: string = loginAuth.token.refresh;
  const prevExpiredAt: string = loginAuth.token.expired_at;
  const prevRefreshableUntil: string = loginAuth.token.refreshable_until;

  // 3. Refresh token using the valid refresh token
  const refreshBody = {
    refresh_token: prevRefresh,
  } satisfies IShoppingSeller.IRefresh;
  const refreshedAuth: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuth);

  // 4. Assert new tokens are returned and differ from previous tokens
  TestValidator.notEquals(
    "Access token should rotate",
    refreshedAuth.token.access,
    prevAccess,
  );
  TestValidator.notEquals(
    "Refresh token should rotate",
    refreshedAuth.token.refresh,
    prevRefresh,
  );

  // 5. Assert tokens have valid string format and reasonable expiry timestamps
  TestValidator.predicate(
    "New access token is a non-empty string",
    typeof refreshedAuth.token.access === "string" &&
      refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "New refresh token is a non-empty string",
    typeof refreshedAuth.token.refresh === "string" &&
      refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at (access token expiry) is in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      refreshedAuth.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until (refresh token expiry) is in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      refreshedAuth.token.refreshable_until,
    ),
  );

  // The authorized metadata for seller should remain consistent, except for rotated tokens and timestamps
  TestValidator.equals(
    "Seller ID unchanged after refresh",
    refreshedAuth.id,
    loginAuth.id,
  );
  TestValidator.equals(
    "Seller email unchanged after refresh",
    refreshedAuth.email,
    loginAuth.email,
  );
  TestValidator.equals(
    "Business display name unchanged after refresh",
    refreshedAuth.display_name,
    loginAuth.display_name,
  );
  TestValidator.equals(
    "Contact phone unchanged after refresh",
    refreshedAuth.contact_phone,
    loginAuth.contact_phone,
  );
  TestValidator.equals(
    "Status unchanged after refresh",
    refreshedAuth.status,
    loginAuth.status,
  );
  TestValidator.equals(
    "is_active unchanged after refresh",
    refreshedAuth.is_active,
    loginAuth.is_active,
  );
}
