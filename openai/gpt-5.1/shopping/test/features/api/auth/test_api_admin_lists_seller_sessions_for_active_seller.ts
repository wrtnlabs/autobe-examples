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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_admin_lists_seller_sessions_for_active_seller(
  connection: api.IConnection,
) {
  // 1. Seller setup: join and multiple logins to create sessions
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // Define two different IPs and referrers to be able to filter later
  const loginIp1: string = "192.168.0.10";
  const loginIp2: string = "10.0.0.20";

  const loginReferrer1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // Helper to perform a seller login with configurable ip/referrer
  const performSellerLogin = async (
    ip: string,
    referrer: string & tags.Format<"uri">,
  ): Promise<void> => {
    const loginBody = {
      email: sellerEmail,
      password: sellerPassword,
      ip,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer,
    } satisfies IShoppingMallSellerAuthLogin.IRequest;

    const loginResult: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.login(connection, {
        body: loginBody,
      });
    typia.assert(loginResult);
  };

  // Create multiple sessions: 3 logins, mixing IPs and referrers
  await performSellerLogin(loginIp1, loginReferrer1);
  await performSellerLogin(loginIp1, loginReferrer2);
  await performSellerLogin(loginIp2, loginReferrer1);

  // Capture a broad time window around now for created_from/to filtering
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  const createdFrom = new Date(now.getTime() - oneHourMs).toISOString();
  const createdTo = new Date(now.getTime() + oneHourMs).toISOString();

  // 2. Admin setup: join to obtain admin authorization
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Admin lists sessions with basic pagination
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageSize = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const basicRequestBody = {
    page,
    pageSize,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallSellerSession.IRequest;

  const basicPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: basicRequestBody,
    });
  typia.assert(basicPage);

  const basicPagination = basicPage.pagination;
  const basicSessions = basicPage.data;

  // Basic pagination invariants
  TestValidator.equals(
    "basic pagination current page matches request",
    basicPagination.current,
    page,
  );
  TestValidator.equals(
    "basic pagination limit matches pageSize",
    basicPagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination.records is at least number of returned rows",
    basicPagination.records >= (basicSessions ? basicSessions.length : 0),
  );
  TestValidator.predicate(
    "pagination.pages is at least 1 when there are records",
    basicPagination.records === 0 || basicPagination.pages >= 1,
  );

  // All sessions must belong to the target seller and expose expected fields
  if (basicSessions.length > 0) {
    for (const session of basicSessions) {
      // type already asserted via typia.assert, now check business constraints
      TestValidator.equals(
        "session has seller summary for the target seller",
        session.seller?.id ?? null,
        sellerId,
      );
      TestValidator.predicate(
        "session.ip is a non-empty string",
        session.ip.length > 0,
      );
      TestValidator.predicate(
        "session.href is a non-empty string",
        session.href.length > 0,
      );
      TestValidator.predicate(
        "session.referrer is a non-empty string",
        session.referrer.length > 0,
      );
      TestValidator.predicate(
        "session.created_at is a non-empty string",
        session.created_at.length > 0,
      );
    }
  }

  // 4. Admin lists sessions filtered by IP (loginIp1)
  const ipFilterRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    ip: loginIp1,
  } satisfies IShoppingMallSellerSession.IRequest;

  const ipFilteredPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: ipFilterRequestBody,
    });
  typia.assert(ipFilteredPage);

  const ipFilteredSessions = ipFilteredPage.data;

  TestValidator.predicate(
    "ip-filtered result has at least one session",
    ipFilteredSessions.length > 0,
  );
  TestValidator.predicate(
    "all ip-filtered sessions match the requested ip",
    ipFilteredSessions.every((s) => s.ip === loginIp1),
  );
  TestValidator.predicate(
    "all ip-filtered sessions belong to the target seller",
    ipFilteredSessions.every((s) => s.seller?.id === sellerId),
  );

  // 5. Admin lists sessions filtered by referrer (loginReferrer1)
  const referrerFilterRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    referrer: loginReferrer1,
  } satisfies IShoppingMallSellerSession.IRequest;

  const referrerFilteredPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: referrerFilterRequestBody,
    });
  typia.assert(referrerFilteredPage);

  const referrerFilteredSessions = referrerFilteredPage.data;

  TestValidator.predicate(
    "referrer-filtered result has at least one session",
    referrerFilteredSessions.length > 0,
  );
  TestValidator.predicate(
    "all referrer-filtered sessions match the requested referrer",
    referrerFilteredSessions.every((s) => s.referrer === loginReferrer1),
  );
  TestValidator.predicate(
    "all referrer-filtered sessions belong to the target seller",
    referrerFilteredSessions.every((s) => s.seller?.id === sellerId),
  );
}
