import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";

/**
 * Validate that an authenticated admin can search for privileged action logs
 * with advanced filtering and pagination.
 *
 * 1. Register and authenticate a new admin via POST /auth/admin/join.
 * 2. Using the admin session, perform PATCH /shoppingMall/admin/adminActionLogs
 *    with diverse filters:
 *
 *    - By action_type
 *    - By admin_id
 *    - By date range (from, to)
 *    - By search substring
 *    - By sorting and pagination
 * 3. Assert that only authenticated admins can access this endpoint (perform test
 *    with no authentication to verify denial).
 * 4. Check that the paginated result contains accurate action log summaries with
 *    action_type, actor, created_at, and context_info per compliance
 *    requirements.
 */
export async function test_api_admin_action_logs_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Perform privileged action log search with multiple filters
  // Simulate a full search with all fields filled
  const now = new Date();
  const adminActionLogSearchBody = {
    // Filter strictly by this admin
    admin_id: admin.id,
    // Simulate a common action_type filter
    action_type: "user_suspend",
    // Date range (from a week before to now)
    from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    to: now.toISOString(),
    // Substring search (simulate a term likely in context_info/action_type)
    search: "suspend",
    // Sort by 'created_at' descending
    sort_by: "created_at",
    sort_dir: "desc",
    // Pagination: first page, limit 10
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallAdminActionLog.IRequest;

  const result: IPageIShoppingMallAdminActionLog.ISummary =
    await api.functional.shoppingMall.admin.adminActionLogs.index(connection, {
      body: adminActionLogSearchBody,
    });
  typia.assert(result);

  // 3. Validate result for proper pagination and summary structure
  TestValidator.predicate(
    "should return paginated result with array of summaries",
    Array.isArray(result.data) && typeof result.pagination === "object",
  );
  // Validate each log summary shape and matching filter
  for (const log of result.data) {
    typia.assert(log);
    TestValidator.equals(
      "log actor matches admin_id filter",
      log.shopping_mall_admin_id,
      admin.id,
    );
    TestValidator.equals(
      "log action_type filter applied",
      log.action_type,
      "user_suspend",
    );
    TestValidator.predicate(
      "log created_at is within range",
      log.created_at >= adminActionLogSearchBody.from! &&
        log.created_at <= adminActionLogSearchBody.to!,
    );
    // Optional context_info: can be null or string, so just assert property exists
    if (log.context_info !== null && log.context_info !== undefined)
      TestValidator.predicate(
        "context_info should be string",
        typeof log.context_info === "string",
      );
    // UUID validation, though typia.assert already covers it
    TestValidator.predicate(
      "log id is uuid",
      typeof log.id === "string" && log.id.length > 0,
    );
  }

  // 4. Negative test: unauthenticated admin should be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to adminActionLogs should be denied",
    async () => {
      await api.functional.shoppingMall.admin.adminActionLogs.index(
        unauthConn,
        {
          body: adminActionLogSearchBody,
        },
      );
    },
  );
}
