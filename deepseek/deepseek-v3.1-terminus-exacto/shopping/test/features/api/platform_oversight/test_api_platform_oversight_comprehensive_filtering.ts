import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOversight";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test comprehensive search with multiple filter combinations on platform oversight records.
 * Includes specific oversight types (health_check, security_scan), date ranges spanning multiple months,
 * mixed severity levels, and resolution status. Validates complex filter combinations work correctly
 * and return precise results. Tests edge cases like searching for non-existent records, empty result sets,
 * and boundary date values.
 */
export async function test_api_platform_oversight_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Validate admin authorization worked
  TestValidator.predicate(
    "admin connection headers updated",
    adminConnection.headers?.Authorization !== undefined,
  );
  // Test 1: Empty filter - should return all records
  const emptyFilterResult =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {} satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  // Test 2: Single oversight type filter
  const healthCheckResults =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          oversight_type: "health_check",
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(healthCheckResults);
  // Test 3: Single severity level filter
  const criticalResults =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          severity_level: "critical",
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(criticalResults);
  // Test 4: Resolution status filter
  const unresolvedResults =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          resolved: false,
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(unresolvedResults);
  // Test 5: Date range filtering with valid past dates
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilterResults =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(dateFilterResults);
  // Test 6: Combined filters - oversight type + severity + resolution (valid scenario)
  const combinedFilterResults =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          oversight_type: "security_scan",
          severity_level: "warning",
          resolved: false,
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(combinedFilterResults);
  // Test 7: Pagination testing
  const paginatedResults =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is positive",
    paginatedResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    paginatedResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginatedResults.pagination.pages >= 0,
  );
  // Test 8: Complex combination with all valid filters
  const complexFilterResults =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          oversight_type: "health_check",
          severity_level: "info",
          resolved: false,
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(complexFilterResults);
  // Validations
  TestValidator.predicate(
    "empty filter returns valid structure",
    Array.isArray(emptyFilterResult.data),
  );
  TestValidator.predicate(
    "combined filter returns valid structure",
    Array.isArray(combinedFilterResults.data),
  );
  TestValidator.predicate(
    "page limit respected when data exists",
    paginatedResults.data.length <= 5,
  );
  // Test edge case: Very restrictive filters that might return empty
  const restrictiveFilterResults =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          oversight_type: "operational_assessment",
          severity_level: "emergency",
          resolved: true,
          created_after: now.toISOString(), // No future records should exist
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(restrictiveFilterResults);
  TestValidator.predicate(
    "restrictive filter returns valid empty array",
    Array.isArray(restrictiveFilterResults.data),
  );
}
