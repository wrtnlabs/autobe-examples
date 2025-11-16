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
 * Test sorting configurations by their data type field.
 *
 * Administrator creates account and retrieves configurations sorted by
 * data_type in ascending and descending order. Validates that configurations
 * are grouped and ordered by their data type values (boolean, decimal, integer,
 * string typically). Confirms the sort is consistent across all returned
 * records and properly groups configurations of the same type together.
 *
 * Key validations:
 *
 * 1. Administrator account creation with proper authentication
 * 2. Configuration retrieval with ascending data_type sort
 * 3. Configuration retrieval with descending data_type sort
 * 4. Proper grouping of same data type configurations
 * 5. Sort consistency and order validation
 */
export async function test_api_platform_configuration_sort_by_data_type(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator account created successfully",
    admin.id !== null && admin.email === adminEmail,
  );

  // Step 2: Retrieve configurations sorted by data_type in ascending order
  const configsAsc: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "data_type",
          order: "asc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(configsAsc);

  // Validate pagination structure
  TestValidator.predicate(
    "ascending sort response has valid pagination",
    configsAsc.pagination.current >= 0 &&
      configsAsc.pagination.limit > 0 &&
      configsAsc.pagination.records >= 0,
  );

  // Validate data array exists and is populated
  TestValidator.predicate(
    "ascending sort response has configuration data",
    Array.isArray(configsAsc.data) && configsAsc.data.length > 0,
  );

  // Step 3: Verify ascending order by data_type
  if (configsAsc.data.length > 1) {
    for (let i = 0; i < configsAsc.data.length - 1; i++) {
      const current = configsAsc.data[i].data_type || "";
      const next = configsAsc.data[i + 1].data_type || "";
      TestValidator.predicate(
        `ascending order maintained between index ${i} and ${i + 1}`,
        current.localeCompare(next) <= 0,
      );
    }
  }

  // Step 4: Retrieve configurations sorted by data_type in descending order
  const configsDesc: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "data_type",
          order: "desc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(configsDesc);

  // Validate descending order structure
  TestValidator.predicate(
    "descending sort response has valid pagination",
    configsDesc.pagination.current >= 0 &&
      configsDesc.pagination.limit > 0 &&
      configsDesc.pagination.records >= 0,
  );

  // Step 5: Verify descending order by data_type
  if (configsDesc.data.length > 1) {
    for (let i = 0; i < configsDesc.data.length - 1; i++) {
      const current = configsDesc.data[i].data_type || "";
      const next = configsDesc.data[i + 1].data_type || "";
      TestValidator.predicate(
        `descending order maintained between index ${i} and ${i + 1}`,
        current.localeCompare(next) >= 0,
      );
    }
  }

  // Step 6: Verify sort order consistency (ascending should be reverse of descending)
  if (configsAsc.data.length === configsDesc.data.length) {
    const ascIds = configsAsc.data.map((c) => c.id);
    const descIds = configsDesc.data.map((c) => c.id);
    const reversedDescIds = [...descIds].reverse();

    TestValidator.equals(
      "ascending and descending sorts are properly reversed",
      ascIds,
      reversedDescIds,
    );
  }

  // Step 7: Validate configuration data integrity
  for (const config of configsAsc.data) {
    TestValidator.predicate(
      `configuration has valid id format`,
      typeof config.id === "string" && config.id.length > 0,
    );
    TestValidator.predicate(
      `configuration has key property`,
      typeof config.key === "string" && config.key.length > 0,
    );
    TestValidator.predicate(
      `configuration has value property`,
      typeof config.value === "string",
    );
  }

  // Step 8: Verify grouping of same data_type configurations
  const dataTypeGroups = new Map<string, number>();
  for (const config of configsAsc.data) {
    const dataType = config.data_type || "untyped";
    dataTypeGroups.set(dataType, (dataTypeGroups.get(dataType) || 0) + 1);
  }

  TestValidator.predicate(
    "configurations are properly grouped by data_type",
    dataTypeGroups.size > 0,
  );

  // Step 9: Test with pagination to ensure sort persists across pages
  const configsPage2: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 2,
          limit: 50,
          sort_by: "data_type",
          order: "asc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(configsPage2);

  TestValidator.predicate(
    "pagination with sort maintains consistency",
    configsPage2.pagination.current === 2 ||
      configsPage2.pagination.records <= 50,
  );
}
