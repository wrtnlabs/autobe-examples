import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";

export async function test_api_shopping_mall_admin_audit_logs_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins to get authorization token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        ip: null,
        href: "https://admin.example.com/register",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Search audit logs with pagination and no additional filter (default page=1, limit undefined)
  const searchBasic =
    await api.functional.shoppingMall.admin.shoppingMallAdminAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(searchBasic);
  TestValidator.predicate(
    "basic search returns valid array",
    Array.isArray(searchBasic.data),
  );
  if (searchBasic.data.length > 0) {
    typia.assert(searchBasic.data[0]);
  }
  TestValidator.predicate(
    "pagination current page matches",
    searchBasic.pagination.current === 1,
  );

  // 3. Search audit logs filtered by success: true with limit
  const searchSuccessTrue =
    await api.functional.shoppingMall.admin.shoppingMallAdminAuditLogs.index(
      connection,
      {
        body: {
          success: true,
          limit: 5,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(searchSuccessTrue);
  TestValidator.predicate(
    "all success are true",
    searchSuccessTrue.data.every((entry) => entry.success === true),
  );
  TestValidator.predicate(
    "limit respected",
    searchSuccessTrue.data.length <= 5,
  );

  // 4. Search audit logs filtered by action_type
  const actionTypeFilter =
    searchBasic.data.length > 0 ? searchBasic.data[0].action_type : null;
  if (actionTypeFilter !== null) {
    const searchActionType =
      await api.functional.shoppingMall.admin.shoppingMallAdminAuditLogs.index(
        connection,
        {
          body: {
            action_type: actionTypeFilter,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAdminAuditLog.IRequest,
        },
      );
    typia.assert(searchActionType);
    TestValidator.predicate(
      "filter by action_type matches",
      searchActionType.data.every(
        (entry) => entry.action_type === actionTypeFilter,
      ),
    );
  }

  // 5. Search audit logs filtered by resource_type
  const resourceTypeFilter =
    searchBasic.data.length > 0 ? searchBasic.data[0].resource_type : null;
  if (resourceTypeFilter !== null) {
    const searchResourceType =
      await api.functional.shoppingMall.admin.shoppingMallAdminAuditLogs.index(
        connection,
        {
          body: {
            resource_type: resourceTypeFilter,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAdminAuditLog.IRequest,
        },
      );
    typia.assert(searchResourceType);
    TestValidator.predicate(
      "filter by resource_type matches",
      searchResourceType.data.every(
        (entry) => entry.resource_type === resourceTypeFilter,
      ),
    );
  }

  // 6. Search audit logs with date filters: created_after and created_before
  // Pick two dates from existing data or generate approximate dates
  if (searchBasic.data.length > 1) {
    // Sort entries by created_at ascending
    const sorted = [...searchBasic.data].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    );
    const createdAfter = sorted[0].created_at;
    const createdBefore = sorted[sorted.length - 1].created_at;

    if (createdAfter && createdBefore) {
      const dateFiltered =
        await api.functional.shoppingMall.admin.shoppingMallAdminAuditLogs.index(
          connection,
          {
            body: {
              created_after: createdAfter,
              created_before: createdBefore,
              page: 1,
              limit: 10,
            } satisfies IShoppingMallAdminAuditLog.IRequest,
          },
        );
      typia.assert(dateFiltered);
      for (const entry of dateFiltered.data) {
        TestValidator.predicate(
          `created_at after filter: ${entry.created_at} >= ${createdAfter}`,
          entry.created_at >= createdAfter,
        );
        TestValidator.predicate(
          `created_at before filter: ${entry.created_at} <= ${createdBefore}`,
          entry.created_at <= createdBefore,
        );
      }
    }
  }
}
