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

export async function test_api_admin_configs_search_by_namespace_free_text_search(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create two configuration records under the same namespace
  const namespace = `risk-${RandomGenerator.alphabets(8)}`;
  const keyword = "risk-threshold";

  const configWithKeywordBody = {
    namespace,
    config_key: `config_${RandomGenerator.alphabets(8)}`,
    environment: "production",
    description: `Configuration for ${keyword} evaluation`,
    value_json: JSON.stringify({
      [keyword]: 0.7,
      mode: "strict",
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const configWithoutKeywordBody = {
    namespace,
    config_key: `config_${RandomGenerator.alphabets(8)}`,
    environment: "production",
    description: "Configuration for generic evaluation", // intentionally no keyword
    value_json: JSON.stringify({
      maxRetries: 3,
      mode: "lenient",
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const configWithKeyword: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configWithKeywordBody,
    });
  typia.assert<IShoppingMallConfig>(configWithKeyword);

  const configWithoutKeyword: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configWithoutKeywordBody,
    });
  typia.assert<IShoppingMallConfig>(configWithoutKeyword);

  // 3. Search by namespace with free-text keyword filter
  const searchRequestBody = {
    page: 0,
    limit: 10,
    namespace,
    search: keyword,
  } satisfies IShoppingMallConfig.IRequest;

  const pageResult: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      { body: searchRequestBody },
    );
  typia.assert<IPageIShoppingMallConfig.ISummary>(pageResult);
  typia.assert<IPage.IPagination>(pageResult.pagination);

  // Assert that at least one record is returned
  TestValidator.predicate(
    "search by namespace and keyword should return at least one record",
    pageResult.data.length > 0,
  );

  // Assert that returned records belong to the correct namespace and contain the keyword
  for (const summary of pageResult.data) {
    typia.assert<IShoppingMallConfig.ISummary>(summary);

    TestValidator.equals(
      "all returned configs must match the requested namespace",
      summary.namespace,
      namespace,
    );

    const descriptionContains =
      summary.description !== null &&
      summary.description !== undefined &&
      summary.description.toLowerCase().includes(keyword.toLowerCase());

    TestValidator.predicate(
      "free-text search should filter by keyword in description",
      descriptionContains,
    );

    // Note: value_json is not part of ISummary, so we only assert on description
  }

  // Ensure that the config without keyword is not among the results by id
  const containsConfigWithoutKeyword = pageResult.data.some(
    (summary) => summary.id === configWithoutKeyword.id,
  );
  TestValidator.predicate(
    "config without keyword must not appear in search results",
    containsConfigWithoutKeyword === false,
  );

  // 5. Optional: verify case-insensitive behavior by searching with upper-case keyword
  const upperCaseKeyword = keyword.toUpperCase();
  const upperCaseSearchBody = {
    page: 0,
    limit: 10,
    namespace,
    search: upperCaseKeyword,
  } satisfies IShoppingMallConfig.IRequest;

  const upperCasePageResult: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.admin.configs.byNamespace.index(
      connection,
      { body: upperCaseSearchBody },
    );
  typia.assert<IPageIShoppingMallConfig.ISummary>(upperCasePageResult);

  // When case-insensitive, configWithKeyword should appear here as well. We allow for
  // implementation-defined behavior but at least assert that, if results exist,
  // they still respect the namespace filter.
  for (const summary of upperCasePageResult.data) {
    typia.assert<IShoppingMallConfig.ISummary>(summary);
    TestValidator.equals(
      "case-variant search results must match namespace",
      summary.namespace,
      namespace,
    );
  }
}
