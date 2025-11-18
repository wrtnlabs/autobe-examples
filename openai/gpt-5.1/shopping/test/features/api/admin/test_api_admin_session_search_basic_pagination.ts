import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Basic pagination test for admin session search.
 *
 * Business goal: Verify that an authenticated shopping mall admin can retrieve
 * a paginated list of their own sessions from shopping_mall_admin_sessions via
 * the PATCH /shoppingMall/admin/admins/{adminId}/sessions endpoint, using both
 * first-page and second-page access patterns.
 *
 * Steps:
 *
 * 1. Register a new admin via POST /auth/admin/join, which returns
 *    IShoppingMallAdmin.IAuthorized and implicitly creates at least one
 *    shopping_mall_admin_sessions row for that admin.
 * 2. Call PATCH /shoppingMall/admin/admins/{adminId}/sessions for page=1 and a
 *    reasonable limit (e.g., 10) with no additional filters in the body beyond
 *    pagination fields.
 * 3. Validate the response type IPageIShoppingMallAdminSession.ISummary, and
 *    assert basic pagination invariants and per-item ownership.
 * 4. Optionally call the same endpoint for page=2 and validate behavior depending
 *    on the total number of pages.
 */
export async function test_api_admin_session_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;

  // 2. First page request with explicit pagination
  const page = 1;
  const limit = 10;

  const firstRequestBody = {
    page,
    limit,
  } satisfies IShoppingMallAdminSession.IRequest;

  const firstPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: firstRequestBody,
    });
  typia.assert<IPageIShoppingMallAdminSession.ISummary>(firstPage);

  const pagination = firstPage.pagination;

  // 3. Assert pagination invariants for first page
  TestValidator.equals(
    "first page current equals requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "first page limit equals requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate("records non-negative", pagination.records >= 0);
  TestValidator.predicate("pages non-negative", pagination.pages >= 0);
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pages at least 1 when records > 0",
      pagination.pages >= 1,
    );
    TestValidator.predicate(
      "records do not exceed pages * limit",
      pagination.records <= pagination.pages * pagination.limit,
    );
  }

  TestValidator.predicate(
    "first page data length does not exceed limit",
    firstPage.data.length <= pagination.limit,
  );

  // 4. Assert per-item ownership and basic field presence
  for (const session of firstPage.data) {
    typia.assert<IShoppingMallAdminSession.ISummary>(session);

    TestValidator.equals(
      "session admin id matches path adminId",
      session.admin.id,
      adminId,
    );

    TestValidator.predicate(
      "session ip is non-empty string",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session href is non-empty string",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer is non-empty string",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
  }

  // 5. Optional second page request
  const secondPageNumber = 2;
  const secondRequestBody = {
    page: secondPageNumber,
    limit,
  } satisfies IShoppingMallAdminSession.IRequest;

  const secondPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: secondRequestBody,
    });
  typia.assert<IPageIShoppingMallAdminSession.ISummary>(secondPage);

  const secondPagination = secondPage.pagination;

  TestValidator.equals(
    "second page current equals requested page",
    secondPagination.current,
    secondPageNumber,
  );
  TestValidator.equals(
    "second page limit equals requested limit",
    secondPagination.limit,
    limit,
  );

  TestValidator.predicate(
    "second page records non-negative",
    secondPagination.records >= 0,
  );

  TestValidator.predicate(
    "second page pages non-negative",
    secondPagination.pages >= 0,
  );

  TestValidator.predicate(
    "second page data length does not exceed limit",
    secondPage.data.length <= secondPagination.limit,
  );
}
