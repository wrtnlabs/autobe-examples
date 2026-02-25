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

export async function test_api_configuration_admin_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Combined filters with matching results
  const searchTerm = "config";
  const dataType = "string";
  const scope = "global";
  const isActive = true;
  const response1 =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
          data_type: dataType,
          scope: scope,
          is_active: isActive,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(response1);
  // Validate all returned configurations match ALL filter criteria
  for (const config of response1.data) {
    TestValidator.predicate(
      "config_key contains search term",
      config.config_key.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    TestValidator.equals(
      "data_type matches filter",
      config.data_type,
      dataType,
    );
    TestValidator.equals("scope matches filter", config.scope, scope);
    TestValidator.equals(
      "is_active matches filter",
      config.is_active,
      isActive,
    );
  }
  // Test 2: Case-insensitive search with uppercase
  const response2 =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          search: searchTerm.toUpperCase(),
          data_type: dataType,
          scope: scope,
          is_active: isActive,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(response2);
  // Test 3: Ambiguous search term that should match multiple patterns
  const ambiguousTerm = "key";
  const response3 =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          search: ambiguousTerm,
          data_type: dataType,
          scope: scope,
          is_active: isActive,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(response3);
  // Test 4: Filter combinations that produce zero results
  const response4 =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_config_key_pattern_xyz123",
          data_type: "boolean",
          scope: "user_group",
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "zero results for impossible filter combination",
    response4.data.length,
    0,
  );
  // Test 5: Null/undefined filter values (should be ignored)
  const response5 =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
          data_type: undefined,
          scope: undefined,
          is_active: undefined,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(response5);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    response1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    response1.pagination.pages >= 0,
  );
}
