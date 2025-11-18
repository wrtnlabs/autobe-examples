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

export async function test_api_admin_configs_search_by_namespace_pagination_behavior(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain auth context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Seed configuration records for a single namespace and environment
  const namespace = "reviews";
  const environment = "production";
  const totalConfigs = 25;

  const createdConfigs: IShoppingMallConfig[] = [];

  for (let i = 0; i < totalConfigs; i++) {
    const createBody = {
      namespace,
      environment,
      config_key: `reviews.config.${i}`,
      description: `Reviews config #${i}`,
      value_json: JSON.stringify({ index: i, enabled: true }),
      is_active: true,
    } satisfies IShoppingMallConfig.ICreate;

    const created = await api.functional.shoppingMall.admin.configs.create(
      connection,
      { body: createBody },
    );
    typia.assert<IShoppingMallConfig>(created);
    createdConfigs.push(created);
  }

  TestValidator.equals(
    "all configs created count should match totalConfigs",
    createdConfigs.length,
    totalConfigs,
  );

  const limit = 10;

  // Helper to collect pagination IDs
  const collectIds = (
    page: IPageIShoppingMallConfig.ISummary,
  ): (string & tags.Format<"uuid">)[] => page.data.map((c) => c.id);

  // 3. Fetch page 0
  const page0Request = {
    namespace,
    environment,
    page: 0 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
  } satisfies IShoppingMallConfig.IRequest;

  const page0 =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      { body: page0Request },
    );
  typia.assert<IPageIShoppingMallConfig.ISummary>(page0);

  TestValidator.equals(
    "page0 pagination.limit should equal requested limit",
    page0.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page0 pagination.current should be 0",
    page0.pagination.current,
    0,
  );
  TestValidator.equals(
    "page0 pagination.records should equal totalConfigs",
    page0.pagination.records,
    totalConfigs,
  );

  const expectedPages = Math.ceil(totalConfigs / limit);
  TestValidator.equals(
    "page0 pagination.pages should equal ceil(totalConfigs/limit)",
    page0.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "page0 data length should be limit",
    page0.data.length,
    limit,
  );

  const page0Ids = collectIds(page0);

  // 4. Fetch page 1
  const page1Request = {
    namespace,
    environment,
    page: 1 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
  } satisfies IShoppingMallConfig.IRequest;

  const page1 =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      { body: page1Request },
    );
  typia.assert<IPageIShoppingMallConfig.ISummary>(page1);

  TestValidator.equals(
    "page1 pagination.limit should equal requested limit",
    page1.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page1 pagination.current should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 pagination.records should equal totalConfigs",
    page1.pagination.records,
    totalConfigs,
  );
  TestValidator.equals(
    "page1 pagination.pages should equal expectedPages",
    page1.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "page1 data length should be limit",
    page1.data.length,
    limit,
  );

  const page1Ids = collectIds(page1);

  // Ensure no overlap between page0 and page1 IDs
  const page0IdSet = new Set(page0Ids);
  const hasOverlap01 = page1Ids.some((id) => page0IdSet.has(id));
  TestValidator.predicate(
    "page0 and page1 should have no overlapping configuration IDs",
    !hasOverlap01,
  );

  // 5. Fetch page 2
  const page2Request = {
    namespace,
    environment,
    page: 2 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
  } satisfies IShoppingMallConfig.IRequest;

  const page2 =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      { body: page2Request },
    );
  typia.assert<IPageIShoppingMallConfig.ISummary>(page2);

  TestValidator.equals(
    "page2 pagination.limit should equal requested limit",
    page2.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page2 pagination.current should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 pagination.records should equal totalConfigs",
    page2.pagination.records,
    totalConfigs,
  );
  TestValidator.equals(
    "page2 pagination.pages should equal expectedPages",
    page2.pagination.pages,
    expectedPages,
  );

  const page2Ids = collectIds(page2);
  TestValidator.predicate(
    "page2 data length should be <= limit",
    page2.data.length <= limit,
  );

  // Ensure no overlap across all three pages
  const page1IdSet = new Set(page1Ids);

  const hasOverlap02 = page2Ids.some((id) => page0IdSet.has(id));
  const hasOverlap12 = page2Ids.some((id) => page1IdSet.has(id));

  TestValidator.predicate(
    "page0 and page2 should have no overlapping configuration IDs",
    !hasOverlap02,
  );
  TestValidator.predicate(
    "page1 and page2 should have no overlapping configuration IDs",
    !hasOverlap12,
  );

  // Sum of unique IDs across pages 0, 1, 2 should equal totalConfigs
  const allIdsSet = new Set<string & tags.Format<"uuid">>([
    ...page0Ids,
    ...page1Ids,
    ...page2Ids,
  ]);

  TestValidator.equals(
    "total unique configuration IDs across pages should equal totalConfigs",
    allIdsSet.size,
    totalConfigs,
  );
}
