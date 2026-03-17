import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallPlatformConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test search and filter functionality for platform configurations.
 * Validates combining search term with scope filter using AND logic.
 */
export async function test_api_super_admin_platform_configs_index_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test search with scope filter: 'upload' + scope='global'
  const searchResult =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.index(
      adminConnection,
      {
        body: {
          search: "upload",
          scope: "global",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallPlatformConfiguration.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid records",
    searchResult.pagination.records >= 0,
  );
  // 4. Validate each result matches both search AND scope criteria
  for (const config of searchResult.data) {
    const configSummary =
      config satisfies IEcommerceMallPlatformConfiguration.ISummary;
    typia.assert(configSummary);
    // Check scope is exactly 'global'
    TestValidator.equals("scope is global", configSummary.scope, "global");
    // Check description contains search term (case-insensitive)
    const descriptionContainsSearch = configSummary.description
      .toLowerCase()
      .includes("upload".toLowerCase());
    TestValidator.predicate(
      "description contains search term",
      descriptionContainsSearch,
    );
  }
  // 5. Test with different search term to verify full-text search
  const searchResult2 =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.index(
      adminConnection,
      {
        body: {
          search: "access",
          scope: "global",
        } satisfies IEcommerceMallPlatformConfiguration.IRequest,
      },
    );
  typia.assert(searchResult2);
  // 6. Validate results match AND logic (both search AND scope filters)
  for (const config of searchResult2.data) {
    const configSummary =
      config satisfies IEcommerceMallPlatformConfiguration.ISummary;
    typia.assert(configSummary);
    TestValidator.equals(
      "scope is global for second search",
      configSummary.scope,
      "global",
    );
    const descriptionContainsSearch2 = configSummary.description
      .toLowerCase()
      .includes("access".toLowerCase());
    TestValidator.predicate(
      "description contains 'access'",
      descriptionContainsSearch2,
    );
  }
  // 7. Test scope filter only (no search term)
  const scopeOnlyResult =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.index(
      adminConnection,
      {
        body: {
          scope: "global",
        } satisfies IEcommerceMallPlatformConfiguration.IRequest,
      },
    );
  typia.assert(scopeOnlyResult);
  // 8. Validate scope-only filter results
  for (const config of scopeOnlyResult.data) {
    const configSummary =
      config satisfies IEcommerceMallPlatformConfiguration.ISummary;
    typia.assert(configSummary);
    TestValidator.equals("scope is global", configSummary.scope, "global");
  }
}
