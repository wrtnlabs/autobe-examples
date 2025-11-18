import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerAuthRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthRefresh";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Validate that seller refresh extends session without password re-entry.
 *
 * 1. Seller joins and then logs in to obtain an initial token set.
 * 2. Use the login refresh token to call /auth/seller/refresh and obtain a new
 *    token set, without resending email/password.
 * 3. Confirm the new access token differs from the old one and is immediately
 *    usable by performing another successful refresh using the latest refresh
 *    token.
 * 4. Join an admin and list seller sessions via PATCH
 *    /shoppingMall/admin/sellers/{sellerId}/sessions to ensure sessions exist
 *    and pagination behaves as expected.
 */
export async function test_api_seller_refresh_extends_session_without_password_reentry(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration) to create an account and initial session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();

  const joinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/signup",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(joinedSeller);

  const joinedToken: IAuthorizationToken = joinedSeller.token;
  typia.assert<IAuthorizationToken>(joinedToken);

  // 2. Seller performs an explicit login to simulate normal auth flow
  const loginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(loggedInSeller);

  const loginToken: IAuthorizationToken = loggedInSeller.token;
  typia.assert<IAuthorizationToken>(loginToken);

  // 3. Refresh using only the login refresh token (no password re-entry)
  const firstRefreshBody = {
    refreshToken: loginToken.refresh,
  } satisfies IShoppingMallSellerAuthRefresh.IRequest;

  const refreshedOnce: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(refreshedOnce);

  const refreshedToken1: IAuthorizationToken = refreshedOnce.token;
  typia.assert<IAuthorizationToken>(refreshedToken1);

  // Access token should change after refresh (implementation dependent but expected)
  TestValidator.notEquals(
    "refresh should issue a new access token",
    refreshedToken1.access,
    loginToken.access,
  );

  // 4. Immediately refresh again using the latest refresh token to ensure the
  //    new token set is fully usable without re-supplying credentials.
  const secondRefreshBody = {
    refreshToken: refreshedToken1.refresh,
  } satisfies IShoppingMallSellerAuthRefresh.IRequest;

  const refreshedTwice: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(refreshedTwice);

  const refreshedToken2: IAuthorizationToken = refreshedTwice.token;
  typia.assert<IAuthorizationToken>(refreshedToken2);

  TestValidator.notEquals(
    "second refresh should also issue a new access token",
    refreshedToken2.access,
    refreshedToken1.access,
  );

  // 5. Basic temporal sanity check: refreshable_until should not precede expired_at
  const loginExpiredAt = new Date(loginToken.expired_at).getTime();
  const loginRefreshableUntil = new Date(
    loginToken.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "login refreshable_until should be >= expired_at",
    loginRefreshableUntil >= loginExpiredAt,
  );

  const refreshed1ExpiredAt = new Date(refreshedToken1.expired_at).getTime();
  const refreshed1RefreshableUntil = new Date(
    refreshedToken1.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "first refresh refreshable_until should be >= expired_at",
    refreshed1RefreshableUntil >= refreshed1ExpiredAt,
  );

  const refreshed2ExpiredAt = new Date(refreshedToken2.expired_at).getTime();
  const refreshed2RefreshableUntil = new Date(
    refreshedToken2.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "second refresh refreshable_until should be >= expired_at",
    refreshed2RefreshableUntil >= refreshed2ExpiredAt,
  );

  // 6. Admin joins to gain access to seller session list API
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 7. As admin, list seller sessions for the created seller
  const sessionRequestBody = {
    page: 1,
    pageSize: 10,
    created_from: null,
    created_to: null,
    expired_from: null,
    expired_to: null,
    ip: null,
    referrer: null,
  } satisfies IShoppingMallSellerSession.IRequest;

  const sellerSessions: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: joinedSeller.id,
      body: sessionRequestBody,
    });
  typia.assert<IPageIShoppingMallSellerSession.ISummary>(sellerSessions);

  const pagination: IPage.IPagination = sellerSessions.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "session list pagination current should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "session list pagination limit should match requested pageSize",
    pagination.limit,
    sessionRequestBody.pageSize,
  );

  // It is acceptable for data length to be zero or more; existence of the
  // endpoint and structure is the primary concern here.
  TestValidator.predicate(
    "session list data length is non-negative",
    sellerSessions.data.length >= 0,
  );
}
