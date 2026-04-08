import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test product analytics filtering by ACTIVE and DELETED status.
 *
 * Validates that super administrators can filter product analytics by product status.
 * When filtering by ACTIVE status, validates that active_count equals total_count and
 * deleted_count is 0, with only non-deleted products in the items array. When filtering
 * by DELETED status, validates that deleted_count equals total_count and active_count
 * is 0, with only soft-deleted products in the items array.
 *
 * This test verifies the business requirement that administrators can distinguish
 * between active and deleted products for oversight purposes, and that product data
 * is correctly categorized based on the deleted_at timestamp.
 *
 * 1. Authenticate as super administrator.
 * 2. Query analytics without filter to establish baseline counts.
 * 3. Query analytics with ACTIVE status and validate counts/items.
 * 4. Query analytics with DELETED status and validate counts/items.
 * 5. Verify pagination metadata matches filtered counts.
 */
export async function test_api_product_analytics_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Query analytics without filter to understand baseline data
  const allAnalyticsResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(allAnalyticsResponse);
  const allAnalytics = allAnalyticsResponse.data[0];
  TestValidator.predicate(
    "analytics response has valid structure",
    allAnalytics !== undefined,
  );
  TestValidator.predicate(
    "total_count is non-negative",
    allAnalytics.total_count >= 0,
  );
  TestValidator.predicate(
    "active_count is non-negative",
    allAnalytics.active_count >= 0,
  );
  TestValidator.predicate(
    "deleted_count is non-negative",
    allAnalytics.deleted_count >= 0,
  );
  TestValidator.equals(
    "total equals active plus deleted",
    allAnalytics.total_count,
    allAnalytics.active_count + allAnalytics.deleted_count,
  );
  // 3. Query analytics with ACTIVE status filter
  const activeAnalyticsResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          status: "ACTIVE",
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(activeAnalyticsResponse);
  const activeAnalytics = activeAnalyticsResponse.data[0];
  // Validate ACTIVE filter counts
  TestValidator.equals(
    "active_count equals total_count when filtering ACTIVE",
    activeAnalytics.total_count,
    activeAnalytics.active_count,
  );
  TestValidator.equals(
    "deleted_count is 0 when filtering ACTIVE",
    activeAnalytics.deleted_count,
    0,
  );
  // 4. Query analytics with DELETED status filter
  const deletedAnalyticsResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          status: "DELETED",
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(deletedAnalyticsResponse);
  const deletedAnalytics = deletedAnalyticsResponse.data[0];
  // Validate DELETED filter counts
  TestValidator.equals(
    "deleted_count equals total_count when filtering DELETED",
    deletedAnalytics.total_count,
    deletedAnalytics.deleted_count,
  );
  TestValidator.equals(
    "active_count is 0 when filtering DELETED",
    deletedAnalytics.active_count,
    0,
  );
  // 5. Validate pagination metadata matches filtered counts
  TestValidator.predicate(
    "ACTIVE response has pagination",
    activeAnalyticsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "DELETED response has pagination",
    deletedAnalyticsResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination records matches filtered count for ACTIVE",
    activeAnalyticsResponse.pagination.records,
    activeAnalytics.total_count,
  );
  TestValidator.equals(
    "pagination records matches filtered count for DELETED",
    deletedAnalyticsResponse.pagination.records,
    deletedAnalytics.total_count,
  );
}
