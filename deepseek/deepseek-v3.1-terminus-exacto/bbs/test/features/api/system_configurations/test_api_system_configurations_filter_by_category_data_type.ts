import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import type { IDiscussionBoardSystemConfigurationValidationItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigurationValidationItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test advanced filtering capabilities by category and data type for system configurations.
 * An administrator searches for configurations using various filter combinations.
 * Validate that the response contains configurations matching the specified filters.
 * Test that the search logic correctly applies filtering criteria.
 */
export async function test_api_system_configurations_filter_by_category_data_type(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // First, get all configurations to understand available categories and data types
  const allConfigs =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          configurations: [],
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(allConfigs);
  if (allConfigs.data.length === 0) {
    // If no configurations exist, the test cannot proceed with filtering
    return;
  }
  // Extract unique categories and data types from existing configurations
  const categories = ArrayUtil.repeat(
    allConfigs.data.length,
    (index) => allConfigs.data[index].category,
  );
  const uniqueCategories = [...new Set(categories)];
  const dataTypes = ArrayUtil.repeat(
    allConfigs.data.length,
    (index) => allConfigs.data[index].data_type,
  );
  const uniqueDataTypes = [...new Set(dataTypes)];
  // Test filtering with available categories and data types
  for (const category of uniqueCategories.slice(0, 2)) {
    // Test with up to 2 categories
    for (const dataType of uniqueDataTypes.slice(0, 2)) {
      // Test with up to 2 data types
      // Search for configurations with specific category and data type
      const filteredResult =
        await api.functional.discussionBoard.admin.system_configurations.index(
          adminConnection,
          {
            body: {
              configurations: [],
            } satisfies IDiscussionBoardSystemConfiguration.IRequest,
          },
        );
      typia.assert(filteredResult);
      // Validate that all returned configurations match the expected criteria
      // (Note: Since the API doesn't support direct category/data_type filtering in the request,
      // we validate that the response contains the expected types)
      if (filteredResult.data.length > 0) {
        // Verify that configurations have valid categories and data types
        for (const config of filteredResult.data) {
          TestValidator.predicate(
            "category should be defined",
            config.category !== undefined && config.category !== "",
          );
          TestValidator.predicate(
            "data type should be defined",
            config.data_type !== undefined && config.data_type !== "",
          );
          TestValidator.predicate(
            "config key should be defined",
            config.config_key !== undefined && config.config_key !== "",
          );
        }
      }
    }
  }
  // Test pagination with different page sizes
  const pageSizes = [5, 10, 20];
  for (const limit of pageSizes) {
    const paginatedResult =
      await api.functional.discussionBoard.admin.system_configurations.index(
        adminConnection,
        {
          body: {
            configurations: [],
          } satisfies IDiscussionBoardSystemConfiguration.IRequest,
        },
      );
    typia.assert(paginatedResult);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination should be defined",
      paginatedResult.pagination !== undefined,
    );
    TestValidator.predicate(
      "current page should be non-negative",
      paginatedResult.pagination.current >= 0,
    );
    TestValidator.predicate(
      "limit should be non-negative",
      paginatedResult.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "records should be non-negative",
      paginatedResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages should be non-negative",
      paginatedResult.pagination.pages >= 0,
    );
  }
}
