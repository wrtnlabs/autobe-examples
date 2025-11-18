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

/**
 * Validate that an authenticated admin can paginate seller authentication
 * sessions and that pagination metadata and data slicing behave correctly.
 *
 * Business context:
 *
 * - Sellers authenticate via /auth/seller/join and /auth/seller/login.
 * - Each successful login creates a seller session record.
 * - Admins can list sessions per seller via PATCH
 *   /shoppingMall/admin/sellers/{sellerId}/sessions.
 *
 * This test ensures that when a seller has multiple login sessions, an admin
 * can request paginated results with a small page size and receive consistent
 * pagination metadata and non-overlapping slices of session summaries, scoped
 * strictly to the specified seller.
 *
 * High-level steps:
 *
 * 1. Create an admin via /auth/admin/join (connection becomes admin-auth).
 * 2. Create a seller via /auth/seller/join (connection becomes seller-auth).
 * 3. Perform multiple seller logins (e.g., 5) via /auth/seller/login to generate
 *    several sessions for that seller.
 * 4. Create another admin via /auth/admin/join so that the connection is
 *    authenticated as an admin for the listing API.
 * 5. Call PATCH /shoppingMall/admin/sellers/{sellerId}/sessions with
 *    IShoppingMallSellerSession.IRequest where page = 1 and pageSize = 2.
 * 6. Validate pagination metadata (current, limit, records, pages) and that data
 *    length matches the expected slice size.
 * 7. Fetch subsequent pages up to pagination.pages, collecting all session IDs and
 *    verifying:
 *
 *    - No duplicate IDs across pages.
 *    - Total collected IDs equals pagination.records.
 *    - All sessions, if they include a seller summary, reference the expected seller
 *         id.
 */
export async function test_api_admin_paginates_seller_sessions_result(
  connection: api.IConnection,
) {
  // 1. Register an admin and authenticate connection as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a seller and authenticate as that seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 3. Perform multiple seller logins to create several sessions
  const loginBase = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const loginCount = 5;
  for (let i = 0; i < loginCount; i++) {
    const loginBody = {
      ...loginBase,
      href:
        i % 2 === 0
          ? ("https://seller.example.com/login" as string & tags.Format<"uri">)
          : ("https://seller.example.com/login-alt" as string &
              tags.Format<"uri">),
    } satisfies IShoppingMallSellerAuthLogin.IRequest;

    const sellerLogin: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.login(connection, {
        body: loginBody,
      });
    typia.assert(sellerLogin);
    TestValidator.equals(
      "logged-in seller id matches joined seller id",
      sellerLogin.id,
      sellerId,
    );
  }

  // 4. Re-authenticate as an admin so that connection has admin JWT
  const secondAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join2" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing2" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const secondAdminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: secondAdminJoinBody,
    });
  typia.assert(secondAdminAuthorized);

  // 5. Call sessions.index with page=1, pageSize=2
  const pageSize = 2;

  const firstRequestBody = {
    page: 1,
    pageSize,
    created_from: undefined,
    created_to: undefined,
    expired_from: undefined,
    expired_to: undefined,
    ip: undefined,
    referrer: undefined,
  } satisfies IShoppingMallSellerSession.IRequest;

  const firstPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: firstRequestBody,
    });
  typia.assert(firstPage);

  const pagination: IPage.IPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "first page current index should be 1",
    pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should equal requested pageSize",
    pagination.limit,
    pageSize,
  );

  TestValidator.predicate(
    "records should be at least the number of login attempts",
    pagination.records >= loginCount,
  );

  TestValidator.predicate("pages should be at least 1", pagination.pages >= 1);

  // First page data sanity
  const firstPageData = firstPage.data;
  TestValidator.predicate(
    "first page data length should be between 0 and limit",
    firstPageData.length <= pagination.limit && firstPageData.length >= 0,
  );

  // All sessions on first page should belong to the expected seller (if seller summary present)
  for (const session of firstPageData) {
    if (session.seller !== undefined) {
      TestValidator.equals(
        "session seller id matches target seller on first page",
        session.seller.id,
        sellerId,
      );
    }
  }

  // 6-7. Iterate over all pages and collect session IDs
  const allSessionIds = new Set<string>();

  const totalPages = pagination.pages;
  for (let page = 1; page <= totalPages; page++) {
    const requestBody = {
      page,
      pageSize,
      created_from: undefined,
      created_to: undefined,
      expired_from: undefined,
      expired_to: undefined,
      ip: undefined,
      referrer: undefined,
    } satisfies IShoppingMallSellerSession.IRequest;

    const pageResult: IPageIShoppingMallSellerSession.ISummary =
      await api.functional.shoppingMall.admin.sellers.sessions.index(
        connection,
        {
          sellerId,
          body: requestBody,
        },
      );
    typia.assert(pageResult);

    TestValidator.equals(
      "pagination current should match requested page",
      pageResult.pagination.current,
      page,
    );

    TestValidator.equals(
      "pagination limit should remain constant across pages",
      pageResult.pagination.limit,
      pageSize,
    );

    TestValidator.equals(
      "pagination records should be stable across pages",
      pageResult.pagination.records,
      pagination.records,
    );

    TestValidator.equals(
      "pagination pages should be stable across pages",
      pageResult.pagination.pages,
      pagination.pages,
    );

    const pageData = pageResult.data;
    TestValidator.predicate(
      "page data length must not exceed limit",
      pageData.length <= pageResult.pagination.limit,
    );

    // Validate seller scoping and collect IDs
    for (const session of pageData) {
      if (session.seller !== undefined) {
        TestValidator.equals(
          "session seller id matches target seller on subsequent pages",
          session.seller.id,
          sellerId,
        );
      }

      // Ensure no duplicate IDs
      const beforeSize = allSessionIds.size;
      allSessionIds.add(session.id);
      const afterSize = allSessionIds.size;
      TestValidator.predicate(
        "session IDs should be unique across pages",
        afterSize === beforeSize + 1,
      );
    }
  }

  // 8. Final aggregation checks
  TestValidator.equals(
    "total unique sessions collected equals pagination.records",
    allSessionIds.size,
    pagination.records,
  );
}
