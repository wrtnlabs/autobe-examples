import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin config search filtering by isActive flag.
 *
 * Business objective: Ensure that PATCH /shoppingMall/platformAdmin/configs
 * returns only active configs when isActive=true, only inactive configs when
 * isActive=false, and a mixed set when isActive is omitted. Also verify that
 * valuePreview and updatedAt in the summary view are consistent with the
 * created configs.
 *
 * High level steps:
 *
 * 1. Join as a new platform admin (POST /auth/platformAdmin/join).
 * 2. Create three configs with different active states.
 * 3. Search with isActive=true and verify only active configs appear.
 * 4. Search with isActive=false and verify only inactive configs appear.
 * 5. Search without isActive filter and verify mixed active/inactive configs.
 */
export async function test_api_platform_admin_configs_search_inactive_and_deleted_exclusion(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create three configuration entries with different active flags
  const namespaceBase = "e2e_config_test";
  const suffix1 = RandomGenerator.alphaNumeric(8);
  const suffix2 = RandomGenerator.alphaNumeric(8);
  const suffix3 = RandomGenerator.alphaNumeric(8);

  const configActive1Body = {
    namespace: `${namespaceBase}_checkout_${suffix1}`,
    key: `max_cart_items_${suffix1}`,
    value: "100",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const configInactive1Body = {
    namespace: `${namespaceBase}_payment_${suffix2}`,
    key: `payment_timeout_${suffix2}`,
    value: "30",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: false,
  } satisfies IShoppingMallConfig.ICreate;

  const configActive2Body = {
    namespace: `${namespaceBase}_reviews_${suffix3}`,
    key: `review_threshold_${suffix3}`,
    value: "10",
    description: null,
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const configActive1 =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: configActive1Body,
    });
  typia.assert<IShoppingMallConfig>(configActive1);

  const configInactive1 =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: configInactive1Body,
    });
  typia.assert<IShoppingMallConfig>(configInactive1);

  const configActive2 =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: configActive2Body,
    });
  typia.assert<IShoppingMallConfig>(configActive2);

  // Helper to check if summary corresponds to a given config
  const matchesConfig = (
    summary: IShoppingMallConfig.ISummary,
    config: IShoppingMallConfig,
  ): boolean => {
    return summary.id === config.id;
  };

  // 3. Search with isActive=true, scoped by search term to our test namespace
  const activeSearchBody = {
    page: 1,
    limit: 20,
    isActive: true,
    search: namespaceBase,
  } satisfies IShoppingMallConfig.IRequest;

  const activePage =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: activeSearchBody,
    });
  typia.assert<IPageIShoppingMallConfig.ISummary>(activePage);

  const activeData = activePage.data;

  const activeHasActive1 = activeData.some((s) =>
    matchesConfig(s, configActive1),
  );
  const activeHasActive2 = activeData.some((s) =>
    matchesConfig(s, configActive2),
  );
  const activeHasInactive1 = activeData.some((s) =>
    matchesConfig(s, configInactive1),
  );

  TestValidator.predicate(
    "isActive=true search should include first active config",
    activeHasActive1,
  );
  TestValidator.predicate(
    "isActive=true search should include second active config",
    activeHasActive2,
  );
  TestValidator.predicate(
    "isActive=true search should not include inactive config",
    !activeHasInactive1,
  );

  await TestValidator.predicate(
    "all summaries in isActive=true search are active",
    async () => activeData.every((s) => s.isActive === true),
  );

  activeData
    .filter(
      (s) => matchesConfig(s, configActive1) || matchesConfig(s, configActive2),
    )
    .forEach((s) => {
      TestValidator.predicate(
        `valuePreview should be non-empty for active config ${s.id}`,
        s.valuePreview.length > 0,
      );
      TestValidator.predicate(
        `updatedAt should be non-empty ISO string for active config ${s.id}`,
        s.updatedAt.length > 0,
      );
    });

  // 4. Search with isActive=false, same namespace scoping
  const inactiveSearchBody = {
    page: 1,
    limit: 20,
    isActive: false,
    search: namespaceBase,
  } satisfies IShoppingMallConfig.IRequest;

  const inactivePage =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: inactiveSearchBody,
    });
  typia.assert<IPageIShoppingMallConfig.ISummary>(inactivePage);

  const inactiveData = inactivePage.data;

  const inactiveHasInactive1 = inactiveData.some((s) =>
    matchesConfig(s, configInactive1),
  );
  const inactiveHasActive1 = inactiveData.some((s) =>
    matchesConfig(s, configActive1),
  );
  const inactiveHasActive2 = inactiveData.some((s) =>
    matchesConfig(s, configActive2),
  );

  TestValidator.predicate(
    "isActive=false search should include inactive config",
    inactiveHasInactive1,
  );
  TestValidator.predicate(
    "isActive=false search should not include first active config",
    !inactiveHasActive1,
  );
  TestValidator.predicate(
    "isActive=false search should not include second active config",
    !inactiveHasActive2,
  );

  await TestValidator.predicate(
    "all summaries in isActive=false search are inactive",
    async () => inactiveData.every((s) => s.isActive === false),
  );

  inactiveData
    .filter((s) => matchesConfig(s, configInactive1))
    .forEach((s) => {
      TestValidator.predicate(
        `valuePreview should be non-empty for inactive config ${s.id}`,
        s.valuePreview.length > 0,
      );
      TestValidator.predicate(
        `updatedAt should be non-empty ISO string for inactive config ${s.id}`,
        s.updatedAt.length > 0,
      );
    });

  // 5. Search without isActive filter (omit isActive), same namespace scoping
  const mixedSearchBody = {
    page: 1,
    limit: 50,
    search: namespaceBase,
  } satisfies IShoppingMallConfig.IRequest;

  const mixedPage =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: mixedSearchBody,
    });
  typia.assert<IPageIShoppingMallConfig.ISummary>(mixedPage);

  const mixedData = mixedPage.data;

  const mixedHasActive1 = mixedData.some((s) =>
    matchesConfig(s, configActive1),
  );
  const mixedHasInactive1 = mixedData.some((s) =>
    matchesConfig(s, configInactive1),
  );

  TestValidator.predicate(
    "unfiltered search should include at least one active config",
    mixedHasActive1,
  );
  TestValidator.predicate(
    "unfiltered search should include the inactive config",
    mixedHasInactive1,
  );
}
