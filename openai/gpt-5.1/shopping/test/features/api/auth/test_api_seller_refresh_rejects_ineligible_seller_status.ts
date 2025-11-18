import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerAuthRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthRefresh";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_seller_refresh_rejects_ineligible_seller_status(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain admin authorization context for calling admin-only endpoints.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // At this point, SDK has set connection.headers.Authorization to the admin access token.
  const adminTokenAfterJoin: IAuthorizationToken = adminAuthorized.token;
  typia.assert<IAuthorizationToken>(adminTokenAfterJoin);

  // 2. Seller joins the platform and receives initial authorized payload.
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorizedFromJoin = await api.functional.auth.seller.join(
    connection,
    {
      body: sellerJoinBody,
    },
  );
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedFromJoin);

  const sellerIdFromJoin = sellerAuthorizedFromJoin.id;
  const sellerStatusFromJoin = sellerAuthorizedFromJoin.status;
  const sellerTokenFromJoin = sellerAuthorizedFromJoin.token;
  typia.assert<IAuthorizationToken>(sellerTokenFromJoin);

  // 3. Seller performs an explicit login to obtain a fresh token bundle.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedFromLogin = await api.functional.auth.seller.login(
    connection,
    {
      body: sellerLoginBody,
    },
  );
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedFromLogin);

  // Seller identity must be consistent between join and login.
  TestValidator.equals(
    "seller id must remain consistent between join and login",
    sellerAuthorizedFromLogin.id,
    sellerIdFromJoin,
  );

  TestValidator.equals(
    "seller email must remain consistent between join and login",
    sellerAuthorizedFromLogin.email,
    sellerEmail,
  );

  const loginToken = sellerAuthorizedFromLogin.token;
  typia.assert<IAuthorizationToken>(loginToken);

  // 4. As admin, search for this seller by email to confirm it is visible and eligible.
  // Ensure connection Authorization holds an admin token by re-joining admin if necessary.
  const adminJoinAgainBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedAgain = await api.functional.auth.admin.join(
    connection,
    {
      body: adminJoinAgainBody,
    },
  );
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedAgain);

  const sellerSearchBody = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 10 satisfies number & tags.Type<"int32">,
    search: undefined,
    status: undefined,
    email: sellerEmail,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallSeller.IRequest;

  const sellerPage = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: sellerSearchBody,
    },
  );
  typia.assert<IPageIShoppingMallSeller.ISummary>(sellerPage);

  // Ensure at least one seller with this email exists in admin search results.
  const matchingSellers = sellerPage.data.filter(
    (summary) => summary.email === sellerEmail,
  );

  TestValidator.predicate(
    "admin search must return at least one seller with the joined email",
    matchingSellers.length > 0,
  );

  // For determinism, we expect exactly one such seller under normal constraints.
  TestValidator.predicate(
    "admin search should return exactly one seller for this unique email",
    matchingSellers.length === 1,
  );

  const sellerSummary = matchingSellers[0];
  TestValidator.equals(
    "seller summary id must match the authenticated seller id",
    sellerSummary.id,
    sellerIdFromJoin,
  );

  // Status in summary should reflect the same lifecycle status as the detail.
  TestValidator.equals(
    "seller summary status should reflect the same status as join payload",
    sellerSummary.status,
    sellerStatusFromJoin,
  );

  // 5. Attempt to refresh with a valid refresh token (from login) and validate identity + token rotation.
  const refreshBody = {
    refreshToken: loginToken.refresh,
  } satisfies IShoppingMallSellerAuthRefresh.IRequest;

  const sellerAuthorizedFromRefresh = await api.functional.auth.seller.refresh(
    connection,
    {
      body: refreshBody,
    },
  );
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedFromRefresh);

  // Identity consistency across login and refresh.
  TestValidator.equals(
    "seller id must remain consistent between login and refresh",
    sellerAuthorizedFromRefresh.id,
    sellerIdFromJoin,
  );

  TestValidator.equals(
    "seller email must remain consistent between login and refresh",
    sellerAuthorizedFromRefresh.email,
    sellerEmail,
  );

  // Token rotation: access and/or refresh token should differ from previous ones.
  const refreshTokenBundle = sellerAuthorizedFromRefresh.token;
  typia.assert<IAuthorizationToken>(refreshTokenBundle);

  TestValidator.notEquals(
    "refreshed access token should differ from login access token",
    refreshTokenBundle.access,
    loginToken.access,
  );

  TestValidator.notEquals(
    "refreshed refresh token should differ from previous refresh token",
    refreshTokenBundle.refresh,
    loginToken.refresh,
  );

  // 6. Re-query admin seller listing after refresh to ensure the seller remains visible and consistent.
  const sellerPageAfterRefresh =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: sellerSearchBody,
    });
  typia.assert<IPageIShoppingMallSeller.ISummary>(sellerPageAfterRefresh);

  const matchingAfterRefresh = sellerPageAfterRefresh.data.filter(
    (summary) => summary.email === sellerEmail,
  );

  TestValidator.predicate(
    "admin search after refresh must still return this seller",
    matchingAfterRefresh.length === 1,
  );

  const sellerSummaryAfterRefresh = matchingAfterRefresh[0];
  TestValidator.equals(
    "seller id from summary after refresh should match original seller id",
    sellerSummaryAfterRefresh.id,
    sellerIdFromJoin,
  );

  // 7. Negative path: using an obviously invalid refresh token should fail.
  await TestValidator.error(
    "refresh must fail when using an invalid refresh token string",
    async () => {
      const invalidRefreshBody = {
        refreshToken: "invalid-refresh-token-value",
      } satisfies IShoppingMallSellerAuthRefresh.IRequest;

      await api.functional.auth.seller.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
