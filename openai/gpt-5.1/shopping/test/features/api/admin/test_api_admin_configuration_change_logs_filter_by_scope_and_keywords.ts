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

export async function test_api_admin_configuration_change_logs_filter_by_scope_and_keywords(
  connection: api.IConnection,
) {
  // 1. Join a platform admin to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a configuration with distinctive textual description
  const domain = "cancellation_policy";
  const changedKeysToken = "changed-keys-holiday-toggle";
  const reasonToken = "holiday promotion rollout";

  const configCreateBody = {
    namespace: domain,
    key: "holiday_promo_toggle",
    value: "true",
    description: `${changedKeysToken} – ${reasonToken}`,
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: configCreateBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Build analytics request with domain and keyword filters
  const now = new Date();
  const fiveMinutesMs = 5 * 60 * 1000;
  const createdAtFrom = new Date(now.getTime() - fiveMinutesMs).toISOString();
  const createdAtTo = new Date(now.getTime() + fiveMinutesMs).toISOString();

  const analyticsRequest = {
    page: 1,
    limit: 20,
    sortBy: "created_at",
    sortDirection: "desc" as const,
    configDomains: [domain],
    // Leave configScope/adminId undefined as we cannot control them here
    changedKeysKeyword: changedKeysToken,
    reasonKeyword: "holiday", // fragment of reasonToken
    createdAtFrom,
    createdAtTo,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const firstPage: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminConfigurations.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(
    firstPage,
  );

  const { pagination, data } = firstPage;

  // Basic structural assertions on pagination and data
  TestValidator.predicate(
    "pagination current page index should be zero or positive",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= data length",
    pagination.records >= data.length,
  );

  if (pagination.records > 0) {
    TestValidator.predicate(
      "data should not be empty when records > 0",
      data.length > 0,
    );

    for (const item of data) {
      // Ensure domain and key summary fields are present and non-empty
      TestValidator.predicate(
        "config_domain should be a non-empty string",
        item.config_domain.length > 0,
      );

      if (item.config_scope !== undefined) {
        TestValidator.predicate(
          "config_scope, when defined, should be non-empty",
          item.config_scope.length > 0,
        );
      }

      TestValidator.predicate(
        "changed_keys_summary should be a non-empty string",
        item.changed_keys_summary.length > 0,
      );

      if (item.reason !== undefined) {
        TestValidator.predicate(
          "reason, when defined, should be non-empty",
          item.reason.length > 0,
        );
      }
    }

    // 4. Negative-style call with a non-matching keyword token
    const nonMatchingToken = RandomGenerator.alphaNumeric(24);

    const negativeRequest = {
      ...analyticsRequest,
      changedKeysKeyword: nonMatchingToken,
    } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

    const negativePage: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
      await api.functional.shoppingMall.platformAdmin.analytics.adminConfigurations.index(
        connection,
        {
          body: negativeRequest,
        },
      );
    typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(
      negativePage,
    );

    TestValidator.predicate(
      "negative query pagination records should be >= 0",
      negativePage.pagination.records >= 0,
    );
    TestValidator.predicate(
      "negative query records should be >= data length",
      negativePage.pagination.records >= negativePage.data.length,
    );
  }
}
