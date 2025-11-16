import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate basic search of admin configuration change logs by domain.
 *
 * Business goal: Ensure that a platform administrator can:
 *
 * 1. Join (register) as a platform admin and obtain an authenticated session.
 * 2. Create a global configuration entry in a known namespace (used as domain).
 * 3. Query the configuration change analytics endpoint with:
 *
 *    - Pagination (page=1, limit=20),
 *    - Domain filter matching the created configuration's namespace,
 *    - A created_at time window that includes the change.
 * 4. Receive a paginated response where:
 *
 *    - At least one record exists,
 *    - Every record's config_domain matches the requested domain,
 *    - Each record's created_at is within the requested time window.
 */
export async function test_api_admin_configuration_change_logs_basic_search_by_domain(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) to obtain an authorized session.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional; omit to keep things simple
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // The SDK's join implementation sets connection.headers.Authorization automatically.

  // 2. Create a configuration entry under a known namespace (used as domain).
  const configNamespace = "checkout";
  const createConfigBody = {
    namespace: configNamespace,
    key: RandomGenerator.alphaNumeric(16),
    value: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  // Capture a time window around config creation to use for created_at filtering.
  const windowStartDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes before

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createConfigBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  const windowEndDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes after

  const createdAtFrom = windowStartDate.toISOString();
  const createdAtTo = windowEndDate.toISOString();

  // 3. Build the analytics filter request body using domain and time window.
  const analyticsRequestBody = {
    page: 1,
    limit: 20,
    // Let backend default sortBy/sortDirection to created_at desc.
    configDomains: [configNamespace],
    createdAtFrom,
    createdAtTo,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  // 4. Call the analytics endpoint.
  const analyticsPage: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminConfigurations.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(
    analyticsPage,
  );

  const pagination: IPage.IPagination = analyticsPage.pagination;
  const logs: IShoppingMallAdminConfigurationChangeLog.ISummary[] =
    analyticsPage.data;

  // 5.a. Assert that at least one configuration change log record exists.
  TestValidator.predicate(
    "at least one configuration change log record should be returned",
    () => pagination.records >= 1 && logs.length >= 1,
  );

  // Prepare Date objects for range comparison.
  const fromTime = new Date(createdAtFrom).getTime();
  const toTime = new Date(createdAtTo).getTime();

  // 5.b & 5.c. Validate domain and created_at range for each log entry.
  for (const log of logs) {
    // Domain match
    TestValidator.equals(
      "log.config_domain must equal requested config namespace domain",
      log.config_domain,
      configNamespace,
    );

    // created_at within [createdAtFrom, createdAtTo]
    const logTime = new Date(log.created_at).getTime();
    TestValidator.predicate(
      "log.created_at must be within requested createdAtFrom/createdAtTo window",
      () => logTime >= fromTime && logTime <= toTime,
    );

    // 5.d (optional): confirm platformAdmin summary is consistent and refers to our admin.
    TestValidator.equals(
      "platformAdmin.id in log must match joined admin.id",
      log.platformAdmin.id,
      admin.id,
    );
    TestValidator.equals(
      "platformAdmin.email in log must match joined admin.email",
      log.platformAdmin.email,
      admin.email,
    );
  }
}
