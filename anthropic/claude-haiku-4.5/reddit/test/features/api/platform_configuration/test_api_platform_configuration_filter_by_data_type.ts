import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";

/**
 * Test filtering platform configurations by their data type.
 *
 * This test validates the data_type filtering functionality of the platform
 * configuration API. It ensures that when querying configurations with a
 * specific data_type filter, only configurations matching that data type are
 * returned, while all other data types are properly excluded.
 *
 * The test executes the following workflow:
 *
 * 1. Create an administrator account for API access
 * 2. Test filtering by each supported data type (boolean, integer, string,
 *    decimal)
 * 3. For each data type filter:
 *
 *    - Verify all returned configurations have matching data_type
 *    - Confirm no configurations of other types are included
 * 4. Validate pagination works correctly with type filters
 */
export async function test_api_platform_configuration_filter_by_data_type(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(10);
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: RandomGenerator.name(),
        href: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test filtering by each supported data type
  const supportedDataTypes = [
    "boolean",
    "integer",
    "string",
    "decimal",
  ] as const;

  for (const dataType of supportedDataTypes) {
    // Query configurations filtered by this specific data type
    const filteredResponse: IPageICommunityPlatformConfiguration.ISummary =
      await api.functional.communityPlatform.administrator.configurations.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            data_type: dataType,
          } satisfies ICommunityPlatformConfiguration.IRequest,
        },
      );
    typia.assert(filteredResponse);

    // Step 3a: Verify all returned configurations have matching data_type
    for (const config of filteredResponse.data) {
      TestValidator.equals(
        `configuration data_type matches filter for ${dataType}`,
        config.data_type,
        dataType,
      );
    }

    // Step 3b: Verify no configurations of other types are included
    const allMatchDataType = filteredResponse.data.every(
      (config) => config.data_type === dataType,
    );
    TestValidator.predicate(
      `all configurations match data_type filter for ${dataType}`,
      allMatchDataType,
    );

    // Step 4: Test pagination with data_type filter
    const paginatedResponse: IPageICommunityPlatformConfiguration.ISummary =
      await api.functional.communityPlatform.administrator.configurations.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            data_type: dataType,
          } satisfies ICommunityPlatformConfiguration.IRequest,
        },
      );
    typia.assert(paginatedResponse);

    // Verify pagination info is present and correct
    TestValidator.predicate(
      `pagination current page is 1 for ${dataType} filter`,
      paginatedResponse.pagination.current === 1,
    );

    TestValidator.predicate(
      `pagination limit matches request for ${dataType} filter`,
      paginatedResponse.pagination.limit === 10,
    );

    // Verify all paginated results match the data_type filter
    for (const config of paginatedResponse.data) {
      TestValidator.equals(
        `paginated configuration data_type matches filter for ${dataType}`,
        config.data_type,
        dataType,
      );
    }
  }
}
