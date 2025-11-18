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
 * Validate that an authenticated admin can retrieve detailed information about
 * one of their own sessions.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context and implicit initial session.
 * 2. List that admin's sessions via PATCH
 *    /shoppingMall/admin/admins/{adminId}/sessions to obtain a valid sessionId
 *    belonging to them.
 * 3. Call GET /shoppingMall/admin/admins/{adminId}/sessions/{sessionId} to fetch
 *    the detailed session record.
 * 4. Verify that the detail response matches the requested identifiers and is
 *    consistent with the summary from the listing call.
 */
export async function test_api_admin_session_detail_for_own_session(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context (and token)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const adminId = authorized.id;

  // 2. List admin sessions to get a valid sessionId
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAdminSession.IRequest;

  const page: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId,
      body: listRequestBody,
    });
  typia.assert(page);

  // Ensure we have at least one session in the listing
  TestValidator.predicate(
    "admin sessions list should contain at least one session",
    page.data.length > 0,
  );

  const summary = page.data[0];

  // 3. Fetch detailed session by id and adminId
  const detail: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.sessions.at(connection, {
      adminId,
      sessionId: summary.id,
    });
  typia.assert(detail);

  // 4. Validate identifiers
  TestValidator.equals(
    "detailed session id should match requested sessionId",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "detailed session admin id should match path adminId",
    detail.shopping_mall_admin_id,
    adminId,
  );

  // Consistency checks: compare fields between summary and detail
  TestValidator.equals(
    "session ip should match between summary and detail",
    summary.ip,
    detail.ip,
  );
  TestValidator.equals(
    "session href should match between summary and detail",
    summary.href,
    detail.href,
  );
  TestValidator.equals(
    "session referrer should match between summary and detail",
    summary.referrer,
    detail.referrer,
  );
  TestValidator.equals(
    "session created_at should match between summary and detail",
    summary.created_at,
    detail.created_at,
  );

  // expired_at can be undefined or null in both; only compare when both
  // are strictly equal by JSON semantics
  TestValidator.equals(
    "session expired_at should match between summary and detail",
    summary.expired_at ?? null,
    detail.expired_at ?? null,
  );

  // Additional sanity checks for non-empty string fields
  TestValidator.predicate(
    "session ip should be non-empty string",
    detail.ip.length > 0,
  );
  TestValidator.predicate(
    "session href should be non-empty string",
    detail.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer should be non-empty string",
    detail.referrer.length > 0,
  );
}
