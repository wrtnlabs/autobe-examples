import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Verify that searching admin audit logs is restricted to authenticated admins.
 *
 * Business purpose:
 *
 * - Ensure that unauthenticated callers cannot access sensitive admin audit logs
 *   search endpoint.
 * - Confirm that a properly authenticated admin can query audit logs and receives
 *   a well-typed paginated response.
 *
 * Steps:
 *
 * 1. Build a minimal audit log search request body with explicit pagination.
 * 2. Create an anonymous connection without any Authorization header and attempt
 *    to call audit log search; expect an authorization error.
 * 3. Register an admin via POST /auth/admin/join using valid join payload.
 * 4. Reuse the original (authenticated) connection, which now carries the admin
 *    token managed by the SDK.
 * 5. Call the audit log search endpoint again and assert the successful response
 *    structure and basic pagination invariants.
 */
export async function test_api_admin_audit_logs_search_access_control(
  connection: api.IConnection,
) {
  // 1. Prepare a minimal search request body
  const page = 1 as number;
  const limit = 10 as number;

  const requestBody = {
    // All filters omitted (undefined) for a broad search
    page,
    limit,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  // 2. Anonymous connection: no Authorization header
  const anonymous: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to access audit logs without authentication - should fail
  await TestValidator.error(
    "anonymous user cannot search admin audit logs",
    async () => {
      await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
        anonymous,
        {
          body: requestBody,
        },
      );
    },
  );

  // 3. Register an admin to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Authenticated admin searches audit logs
  const pageResult: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(pageResult);

  const pagination = pageResult.pagination;

  // Basic pagination invariants
  TestValidator.equals(
    "pagination current matches requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  // data length should not exceed limit (business-friendly invariant)
  TestValidator.predicate(
    "returned data length does not exceed pagination limit",
    pageResult.data.length <= pagination.limit,
  );
}
