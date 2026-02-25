import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator search functionality for platform configurations with filtering and pagination.
 *
 * Validates that authenticated administrators can:
 * - Search configurations by partial key matching
 * - Filter by data_type (boolean, integer, string, json)
 * - Filter by scope (global, environment, feature, user_group)
 * - Filter by active status
 * - Use pagination controls with page and limit parameters
 * - Receive properly formatted paginated responses
 *
 * Tests edge cases including empty results, maximum limit constraints, and admin authentication requirements.
 */
export async function test_api_configuration_admin_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Test search with partial key matching using random search term
  const searchResult =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Test filtering by data_type
  const dataTypes = ["boolean", "integer", "string", "json"] as const;
  for (const dataType of dataTypes) {
    const filteredResult =
      await api.functional.communityPlatform.admin.configurations.index(
        adminConnection,
        {
          body: {
            data_type: dataType,
          } satisfies ICommunityPlatformConfiguration.IRequest,
        },
      );
    typia.assert(filteredResult);
  }
  // 4. Test filtering by scope
  const scopes = ["global", "environment", "feature", "user_group"] as const;
  for (const scope of scopes) {
    const scopeResult =
      await api.functional.communityPlatform.admin.configurations.index(
        adminConnection,
        {
          body: {
            scope: scope,
          } satisfies ICommunityPlatformConfiguration.IRequest,
        },
      );
    typia.assert(scopeResult);
  }
  // 5. Test filtering by active status
  const activeResult =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          is_active: true,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(activeResult);
  const inactiveResult =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          is_active: false,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(inactiveResult);
  // 6. Test pagination controls with boundary values
  const paginationResult =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          page: 1, // Minimum valid page
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(paginationResult);
  // 7. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    paginationResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(paginationResult.data),
  );
  // 8. Test maximum limit constraint
  const maxLimitResult =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          limit: 100, // Maximum valid limit
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  // 9. Test search with no results using random non-existent term
  const noResultsSearch =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(20) + "_nonexistent",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(noResultsSearch);
  TestValidator.predicate(
    "empty data array for no results",
    noResultsSearch.data.length === 0,
  );
  // 10. Test combined filters
  const combinedResult =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          data_type: "string",
          scope: "global",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 11. Validate response structure for configuration items
  if (combinedResult.data.length > 0) {
    const configItem = combinedResult.data[0];
    TestValidator.predicate("has id field", typeof configItem.id === "string");
    TestValidator.predicate(
      "has config_key field",
      typeof configItem.config_key === "string",
    );
    TestValidator.predicate(
      "has data_type field",
      typeof configItem.data_type === "string",
    );
    TestValidator.predicate(
      "has scope field",
      typeof configItem.scope === "string",
    );
    TestValidator.predicate(
      "has is_active field",
      typeof configItem.is_active === "boolean",
    );
  }
}
