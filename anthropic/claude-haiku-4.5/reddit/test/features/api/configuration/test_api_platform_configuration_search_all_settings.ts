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
 * Test retrieving all platform configurations with pagination.
 *
 * Administrator creates an account, then searches for all configurations with
 * default pagination (page 1, limit 20). The endpoint returns a paginated list
 * of configuration settings with their keys, values, data types, descriptions,
 * and timestamps. Validates that the response includes proper pagination
 * metadata (current page, limit, total records, total pages) and that
 * configuration data is properly formatted. Tests the default sorting order (by
 * key) and confirms configurations are presented in ascending order.
 *
 * Steps:
 *
 * 1. Administrator creates account via join endpoint
 * 2. Search for all configurations with default pagination (page=1, limit=20)
 * 3. Validate pagination metadata is correct
 * 4. Verify configuration items are properly formatted with required fields
 * 5. Confirm configurations are sorted by key in ascending order
 */
export async function test_api_platform_configuration_search_all_settings(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin account should be created with matching email",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Step 2: Search for all configurations with default pagination
  const configResponse: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(configResponse);

  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    configResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should be 20",
    configResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    configResponse.pagination.records >= 0,
  );

  // Calculate expected pages (0 records should have 0 pages, otherwise ceiling division)
  const expectedPages =
    configResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          configResponse.pagination.records / configResponse.pagination.limit,
        );
  TestValidator.equals(
    "total pages should match records divided by limit",
    configResponse.pagination.pages,
    expectedPages,
  );

  // Step 4: Verify configuration items are properly formatted
  if (configResponse.data.length > 0) {
    configResponse.data.forEach((config) => {
      // UUID format is already validated by typia.assert()
      TestValidator.predicate(
        `configuration ${config.id} should have non-empty key`,
        config.key.length > 0,
      );
      TestValidator.predicate(
        `configuration ${config.id} should have value`,
        config.value.length > 0,
      );
      TestValidator.predicate(
        `configuration ${config.id} should have created_at timestamp`,
        config.created_at !== undefined && config.created_at.length > 0,
      );
      TestValidator.predicate(
        `configuration ${config.id} should have updated_at timestamp`,
        config.updated_at !== undefined && config.updated_at.length > 0,
      );
    });
  }

  // Step 5: Confirm configurations are sorted by key in ascending order
  if (configResponse.data.length > 1) {
    for (let i = 0; i < configResponse.data.length - 1; i++) {
      const currentKey = configResponse.data[i].key;
      const nextKey = configResponse.data[i + 1].key;
      TestValidator.predicate(
        `configuration at index ${i} key "${currentKey}" should be <= next key "${nextKey}"`,
        currentKey.localeCompare(nextKey) <= 0,
      );
    }
  }
}
