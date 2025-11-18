import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate basic filtering and pagination for admin configuration listing.
 *
 * Business context:
 *
 * - Only authenticated admins can browse global configuration rows stored in
 *   shopping_mall_configs.
 * - Admins need to filter by namespace/config_key and control page/limit and sort
 *   order when inspecting configuration.
 *
 * This test:
 *
 * 1. Registers an admin account and uses its authenticated context.
 * 2. Seeds several configuration rows across two namespaces ("checkout" and
 *    "catalog") with varying config_key, environment, and is_active values.
 * 3. Calls PATCH /shoppingMall/admin/configs (index) with a request body that
 *    filters by namespace and applies pagination and ordering.
 * 4. Verifies that:
 *
 *    - Only matching namespace/config_key entries are returned.
 *    - Pagination metadata is consistent with seeded data and chosen limit.
 *    - Ordering by config_key behaves as requested.
 */
export async function test_api_admin_configs_index_basic_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context through SDK
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed configuration rows in two namespaces
  const namespaceCheckout = "checkout";
  const namespaceCatalog = "catalog";

  const seedConfig = async (
    namespace: string,
    config_key: string,
    environment: string,
    is_active: boolean,
  ): Promise<IShoppingMallConfig> => {
    const body = {
      namespace,
      config_key,
      environment,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      value_json: JSON.stringify({
        flag: true,
        threshold: Math.floor(Math.random() * 100),
        note: RandomGenerator.paragraph({ sentences: 2 }),
      }),
      is_active,
    } satisfies IShoppingMallConfig.ICreate;

    const created: IShoppingMallConfig =
      await api.functional.shoppingMall.admin.configs.create(connection, {
        body,
      });
    typia.assert<IShoppingMallConfig>(created);
    return created;
  };

  // Create multiple checkout configs
  const checkoutConfig1 = await seedConfig(
    namespaceCheckout,
    "checkout.maxCartItems",
    "production",
    true,
  );
  const checkoutConfig2 = await seedConfig(
    namespaceCheckout,
    "checkout.enableGuestCheckout",
    "production",
    true,
  );
  const checkoutConfig3 = await seedConfig(
    namespaceCheckout,
    "checkout.experimentVariant",
    "staging",
    false,
  );

  // Create multiple catalog configs
  const catalogConfig1 = await seedConfig(
    namespaceCatalog,
    "catalog.defaultSort",
    "production",
    true,
  );
  const catalogConfig2 = await seedConfig(
    namespaceCatalog,
    "catalog.searchBoost",
    "staging",
    false,
  );

  const allSeeded: IShoppingMallConfig[] = [
    checkoutConfig1,
    checkoutConfig2,
    checkoutConfig3,
    catalogConfig1,
    catalogConfig2,
  ];

  // 3. Call index with namespace filter and pagination
  const limit = 2;
  const page0Request = {
    page: 0 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    namespace: namespaceCheckout,
    order_by: "config_key",
    order_direction: "asc",
  } satisfies IShoppingMallConfig.IRequest;

  const page0: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.index(connection, {
      body: page0Request,
    });
  typia.assert<IPageIShoppingMallConfig.ISummary>(page0);

  const checkoutAll = allSeeded.filter(
    (cfg) => cfg.namespace === namespaceCheckout,
  );

  // 4. Verify pagination metadata for namespace filter
  const expectedTotalCheckout = checkoutAll.length;
  TestValidator.equals(
    "pagination.current is 0 for first page",
    page0.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    page0.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination.records equals total checkout configs",
    page0.pagination.records,
    expectedTotalCheckout,
  );
  const expectedPages =
    expectedTotalCheckout === 0
      ? 0
      : Math.ceil(expectedTotalCheckout / page0.pagination.limit);
  TestValidator.equals(
    "pagination.pages matches ceiling(records/limit)",
    page0.pagination.pages,
    expectedPages,
  );

  // Ensure all data items belong to checkout namespace and sorted by config_key asc
  TestValidator.predicate(
    "all returned configs are from checkout namespace",
    page0.data.every((cfg) => cfg.namespace === namespaceCheckout),
  );

  const sortedByKeyAsc = [...page0.data].sort((a, b) =>
    a.config_key.localeCompare(b.config_key),
  );
  TestValidator.equals(
    "data sorted by config_key ascending",
    page0.data,
    sortedByKeyAsc,
  );

  // 5. Second call: filter by specific config_key within checkout
  const targetKey = checkoutConfig2.config_key;
  const keyFilterRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    namespace: namespaceCheckout,
    config_key: targetKey,
    order_by: "updated_at",
    order_direction: "desc",
  } satisfies IShoppingMallConfig.IRequest;

  const keyFilteredPage: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.index(connection, {
      body: keyFilterRequest,
    });
  typia.assert<IPageIShoppingMallConfig.ISummary>(keyFilteredPage);

  // All records must match namespace and config_key
  TestValidator.predicate(
    "all key-filtered configs are checkout + specific key",
    keyFilteredPage.data.every(
      (cfg) =>
        cfg.namespace === namespaceCheckout && cfg.config_key === targetKey,
    ),
  );

  // Records count in pagination must match number of seeded configs matching that key
  const expectedKeyMatches = checkoutAll.filter(
    (cfg) => cfg.config_key === targetKey,
  ).length;
  TestValidator.equals(
    "key-filter pagination.records equals number of matching configs",
    keyFilteredPage.pagination.records,
    expectedKeyMatches,
  );

  // 6. Optional second page for namespace-only filter when more than limit records
  if (expectedTotalCheckout > limit) {
    const page1Request = {
      page: 1 as number & tags.Type<"int32">,
      limit: limit as number & tags.Type<"int32">,
      namespace: namespaceCheckout,
      order_by: "config_key",
      order_direction: "asc",
    } satisfies IShoppingMallConfig.IRequest;

    const page1: IPageIShoppingMallConfig.ISummary =
      await api.functional.shoppingMall.admin.configs.index(connection, {
        body: page1Request,
      });
    typia.assert<IPageIShoppingMallConfig.ISummary>(page1);

    TestValidator.equals(
      "page1 pagination.current is 1",
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      "page1 pagination.records equals total checkout configs",
      page1.pagination.records,
      expectedTotalCheckout,
    );

    // Union of items from page0 and page1 should not exceed total checkout configs
    const unionIds = new Set<string>();
    for (const item of [...page0.data, ...page1.data]) unionIds.add(item.id);

    TestValidator.predicate(
      "union of page0 and page1 does not exceed total checkout configs",
      unionIds.size <= expectedTotalCheckout,
    );
  }
}
