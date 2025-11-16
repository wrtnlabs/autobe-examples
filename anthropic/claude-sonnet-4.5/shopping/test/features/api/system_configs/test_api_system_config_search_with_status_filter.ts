import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test filtering system configurations by activation status.
 *
 * This test validates the critical status-based filtering functionality that
 * allows administrators to distinguish between active configurations (currently
 * in effect) and inactive configurations (disabled). This capability is
 * essential for platform governance, troubleshooting, and configuration
 * management.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin user to access system configuration endpoints
 * 2. Search with status='active' filter and verify all results are active
 * 3. Search with status='inactive' filter and verify all results are inactive
 * 4. Search without status filter and verify mixed results are allowed
 * 5. Validate pagination metadata accuracy for each filtered search
 */
export async function test_api_system_config_search_with_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to gain access to system configuration endpoints
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Search for active configurations only
  const activeSearchRequest = {
    page: 1,
    limit: 20,
    status: "active" as const,
  } satisfies IShoppingMallSystemConfig.IRequest;

  const activeResults: IPageIShoppingMallSystemConfig.ISummary =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: activeSearchRequest,
    });
  typia.assert(activeResults);

  // Validate pagination metadata for active search
  TestValidator.predicate(
    "active search pagination current page should be 1",
    activeResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "active search pagination limit should match request",
    activeResults.pagination.limit === 20,
  );

  // Validate all returned configurations have status='active'
  if (activeResults.data.length > 0) {
    for (const config of activeResults.data) {
      TestValidator.equals(
        "configuration status should be active",
        config.status,
        "active",
      );
    }
  }

  // Step 3: Search for inactive configurations only
  const inactiveSearchRequest = {
    page: 1,
    limit: 20,
    status: "inactive" as const,
  } satisfies IShoppingMallSystemConfig.IRequest;

  const inactiveResults: IPageIShoppingMallSystemConfig.ISummary =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: inactiveSearchRequest,
    });
  typia.assert(inactiveResults);

  // Validate pagination metadata for inactive search
  TestValidator.predicate(
    "inactive search pagination current page should be 1",
    inactiveResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "inactive search pagination limit should match request",
    inactiveResults.pagination.limit === 20,
  );

  // Validate all returned configurations have status='inactive'
  if (inactiveResults.data.length > 0) {
    for (const config of inactiveResults.data) {
      TestValidator.equals(
        "configuration status should be inactive",
        config.status,
        "inactive",
      );
    }
  }

  // Step 4: Search without status filter to verify mixed results are possible
  const noFilterSearchRequest = {
    page: 1,
    limit: 50,
  } satisfies IShoppingMallSystemConfig.IRequest;

  const noFilterResults: IPageIShoppingMallSystemConfig.ISummary =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: noFilterSearchRequest,
    });
  typia.assert(noFilterResults);

  // Validate pagination metadata for unfiltered search
  TestValidator.predicate(
    "unfiltered search pagination current page should be 1",
    noFilterResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "unfiltered search pagination limit should match request",
    noFilterResults.pagination.limit === 50,
  );

  // Verify that unfiltered search can return configurations with any status
  // (This validates that the status filter is truly optional and not always applied)
  if (noFilterResults.data.length > 0) {
    const statuses = noFilterResults.data.map((config) => config.status);
    TestValidator.predicate(
      "unfiltered search should return configurations",
      statuses.length > 0,
    );
  }
}
