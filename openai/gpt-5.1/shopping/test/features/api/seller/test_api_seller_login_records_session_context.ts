import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_seller_login_records_session_context(
  connection: api.IConnection,
) {
  // 1. Create a seller that can log in.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "203.0.113.10" as string & tags.Format<"ipv4">,
    href: "https://frontend.example.com/seller/join" as string &
      tags.Format<"uri">,
    referrer: "https://frontend.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(joinedSeller);

  // 2. First seller login with explicit session context.
  const loginIp1 = "203.0.113.11";
  const loginHref1 = "https://frontend.example.com/seller/login";
  const loginReferrer1 = "https://frontend.example.com/home";

  const sellerLoginBody1 = {
    email: joinedSeller.email,
    password: sellerJoinBody.password,
    ip: loginIp1,
    href: loginHref1,
    referrer: loginReferrer1,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const authorizedSeller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody1,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller1);

  TestValidator.equals(
    "seller id from login matches joined seller id",
    authorizedSeller1.id,
    joinedSeller.id,
  );

  // 3. Join an admin account to be able to call admin-only endpoints.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "198.51.100.20" as string & tags.Format<"ipv4">,
    href: "https://frontend.example.com/admin/join" as string &
      tags.Format<"uri">,
    referrer: "https://frontend.example.com/admin/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Exercise admin seller search; ensure seller is discoverable.
  const sellerSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    email: joinedSeller.email,
  } satisfies IShoppingMallSeller.IRequest;

  const sellerPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: sellerSearchBody,
    });
  typia.assert<IPageIShoppingMallSeller.ISummary>(sellerPage);

  const foundSellerSummary = sellerPage.data.find(
    (s) => s.id === joinedSeller.id,
  );
  TestValidator.predicate(
    "joined seller should be present in admin seller search by email",
    foundSellerSummary !== undefined,
  );

  // 5. List sessions for this seller after first login.
  const sessionListBody1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    created_from: null,
    created_to: null,
    expired_from: null,
    expired_to: null,
    ip: null,
    referrer: null,
  } satisfies IShoppingMallSellerSession.IRequest;

  const sessionsPage1: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: joinedSeller.id,
      body: sessionListBody1,
    });
  typia.assert<IPageIShoppingMallSellerSession.ISummary>(sessionsPage1);

  TestValidator.predicate(
    "at least one session should exist after first login",
    sessionsPage1.pagination.records >= 1,
  );

  // Assume sessions are returned newest first; otherwise, sort by created_at.
  const sessions1 = [...sessionsPage1.data].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  const latestSession1 = sessions1[0];
  typia.assert<IShoppingMallSellerSession.ISummary>(latestSession1);

  TestValidator.equals(
    "latest session seller id matches logged-in seller id",
    latestSession1.seller?.id ?? "",
    joinedSeller.id,
  );

  TestValidator.equals(
    "latest session ip matches login ip",
    latestSession1.ip,
    loginIp1,
  );

  TestValidator.equals(
    "latest session href matches login href",
    latestSession1.href,
    loginHref1,
  );

  TestValidator.equals(
    "latest session referrer matches login referrer",
    latestSession1.referrer,
    loginReferrer1,
  );

  TestValidator.equals(
    "latest session expired_at should be null for active session",
    latestSession1.expired_at ?? null,
    null,
  );

  const firstSessionsCount = sessionsPage1.pagination.records;

  // 6. Perform a second seller login with different session context.
  const loginIp2 = "203.0.113.12";
  const loginHref2 =
    "https://frontend.example.com/seller/login?next=/dashboard";
  const loginReferrer2 = "https://frontend.example.com/campaign";

  const sellerLoginBody2 = {
    email: joinedSeller.email,
    password: sellerJoinBody.password,
    ip: loginIp2,
    href: loginHref2,
    referrer: loginReferrer2,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const authorizedSeller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody2,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller2);

  // 7. List sessions again after second login.
  const sessionListBody2 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    created_from: null,
    created_to: null,
    expired_from: null,
    expired_to: null,
    ip: null,
    referrer: null,
  } satisfies IShoppingMallSellerSession.IRequest;

  const sessionsPage2: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: joinedSeller.id,
      body: sessionListBody2,
    });
  typia.assert<IPageIShoppingMallSellerSession.ISummary>(sessionsPage2);

  TestValidator.predicate(
    "session records count should increase after second login",
    sessionsPage2.pagination.records >= firstSessionsCount + 1,
  );

  const sessions2 = [...sessionsPage2.data].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  const latestSession2 = sessions2[0];
  typia.assert<IShoppingMallSellerSession.ISummary>(latestSession2);

  TestValidator.equals(
    "latest session ip matches second login ip",
    latestSession2.ip,
    loginIp2,
  );

  TestValidator.equals(
    "latest session href matches second login href",
    latestSession2.href,
    loginHref2,
  );

  TestValidator.equals(
    "latest session referrer matches second login referrer",
    latestSession2.referrer,
    loginReferrer2,
  );

  TestValidator.equals(
    "latest session expired_at should be null after second login",
    latestSession2.expired_at ?? null,
    null,
  );
}
