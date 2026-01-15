import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_filter_by_category(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Fetch all configurations to find at least one existing configuration
  const allConfigs: IPageICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(allConfigs);
  // Validate that we have at least one configuration
  TestValidator.predicate(
    "system has at least one configuration",
    allConfigs.pagination.records > 0,
  );
  // Step 3: Find a category from existing configurations
  // We need at least one configuration to test filtering
  const availableCategory = allConfigs.data[0].category;
  // Step 4: Test filtering by the available category from existing configs
  const filteredResult: IPageICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          category: availableCategory,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Validate that we get results with the same category
  TestValidator.equals(
    "filtered category has matching category name",
    filteredResult.data[0].category,
    availableCategory,
  );
  TestValidator.predicate(
    "filtered results are not empty",
    filteredResult.pagination.records > 0,
  );
  // Step 5: Test filtering by an unsupported category - should return empty results
  const unsupportedResult: IPageICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          category: "nonexistent_category_12345",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(unsupportedResult);
  // Validate pagination metadata for empty results
  TestValidator.equals(
    "unsupported category has 0 results",
    unsupportedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "unsupported category has 0 pages",
    unsupportedResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "unsupported category has correct limit",
    unsupportedResult.pagination.limit,
    10,
  );
  // Validate data content - should be empty array
  TestValidator.equals(
    "unsupported category has correct number of items",
    unsupportedResult.data.length,
    0,
  );
}
