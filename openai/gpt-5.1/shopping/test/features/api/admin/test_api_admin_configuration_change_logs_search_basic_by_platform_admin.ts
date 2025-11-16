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
 * Basic search of admin configuration change logs by a platform administrator.
 *
 * This E2E test verifies that an authenticated platform administrator can call
 * the admin configuration change log search endpoint with simple pagination and
 * actor/time-range filters, and that the response structure and basic
 * invariants are correct.
 *
 * Business flow:
 *
 * 1. Register and implicitly authenticate a new platform admin by calling POST
 *    /auth/platformAdmin/join. The SDK will attach an Authorization token to
 *    the provided connection so that subsequent calls execute in the context of
 *    this admin.
 * 2. Create a new global configuration entry via POST
 *    /shoppingMall/platformAdmin/configs using an IShoppingMallConfig.ICreate
 *    body with a dedicated namespace and a random key to avoid collisions. The
 *    test only asserts that the response matches IShoppingMallConfig; it does
 *    not depend on any particular business semantics of the config itself.
 * 3. Build a time window that roughly brackets the moment when configuration
 *    changes might be recorded: compute a `from` timestamp slightly before the
 *    current time and a `to` timestamp slightly after, both as ISO 8601
 *    strings. These timestamps will be used as createdAtFrom/createdAtTo
 *    filters in the log search request.
 * 4. Call PATCH /shoppingMall/platformAdmin/adminConfigurationChangeLogs via
 *    api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index
 *    with an IShoppingMallAdminConfigurationChangeLog.IRequest body including:
 *
 *    - Page = 1 and limit = 20 for basic pagination,
 *    - AdminId = authenticated admin id, so only logs for this actor are returned,
 *    - CreatedAtFrom and createdAtTo set to the computed time window,
 *    - All other filters left undefined so that they do not restrict results.
 * 5. Assert that the response conforms to
 *    IPageIShoppingMallAdminConfigurationChangeLog.ISummary using typia.assert,
 *    then validate key pagination invariants:
 *
 *    - Current page index is >= 0,
 *    - Limit is >= 0,
 *    - Data.length <= limit,
 *    - When records == 0, pages == 0 and data is empty.
 * 6. When there are one or more records, additionally verify for each
 *    IShoppingMallAdminConfigurationChangeLog.ISummary item that
 *    platformAdmin.id equals the authenticated admin's id. This confirms that
 *    the adminId filter is respected by the backend.
 *
 * The test does not attempt to force the creation of specific log entries or to
 * assert on particular config_domain/config_key values, because no config
 * update API is available in the current test surface. Instead it focuses on
 * validating that the search endpoint behaves consistently and that any logs
 * returned for the authenticated admin respect the requested filters.
 */
export async function test_api_admin_configuration_change_logs_search_basic_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.e2e-test.shoppingmall.local/join",
    referrer: "https://admin.e2e-test.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new configuration entry under a dedicated namespace
  const configCreateBody = {
    namespace: "e2e_admin_logs",
    key: `search_basic_${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: configCreateBody,
    });
  typia.assert(createdConfig);

  // 3. Build a time window around now for createdAtFrom/createdAtTo filters
  const now = new Date();
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const toDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes later
  const createdAtFrom = fromDate.toISOString();
  const createdAtTo = toDate.toISOString();

  // 4. Call the admin configuration change logs search endpoint
  const requestBody = {
    page: 1,
    limit: 20,
    adminId: admin.id,
    createdAtFrom,
    createdAtTo,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const page: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  const pagination = page.pagination;
  const data = page.data;

  // 5. Basic pagination invariants
  TestValidator.predicate(
    "pagination current page must be >= 0",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit must be >= 0",
    pagination.limit >= 0,
  );

  TestValidator.predicate(
    "data length must not exceed pagination limit",
    data.length <= pagination.limit,
  );

  // When there are no records, pages should be 0 and data empty
  if (pagination.records === 0) {
    TestValidator.equals("no records implies zero pages", pagination.pages, 0);
    TestValidator.equals("no records implies empty data array", data.length, 0);
    return;
  }

  // When there are records, pages should be >= 1
  TestValidator.predicate(
    "records > 0 implies at least one page",
    pagination.pages >= 1,
  );

  // 6. Per-entry validations when logs exist
  for (const log of data) {
    // platformAdmin.id must match the authenticated admin id because adminId filter was applied
    TestValidator.equals(
      "log platformAdmin.id must match authenticated admin id",
      log.platformAdmin.id,
      admin.id,
    );
  }
}
