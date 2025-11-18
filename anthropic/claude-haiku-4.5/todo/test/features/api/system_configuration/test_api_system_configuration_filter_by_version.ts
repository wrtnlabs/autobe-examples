import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSystemConfiguration";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test filtering system configurations by version number.
 *
 * This test validates the version filtering functionality of the system
 * configuration API. The workflow includes:
 *
 * 1. User authentication to establish session context
 * 2. Creating multiple configuration entries (all start with version 1)
 * 3. Filtering to retrieve only version 1 configurations
 * 4. Validating that pagination and version filtering work together
 * 5. Confirming that only entries matching the specified version are returned
 */
export async function test_api_system_configuration_filter_by_version(
  connection: api.IConnection,
) {
  // 1. Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create multiple system configuration entries (version 1)
  const configEntries: ITodoListSystemConfig[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const config: ITodoListSystemConfig =
        await api.functional.todoList.systemConfigurations.create(connection, {
          body: {
            config_key: `config_${RandomGenerator.alphaNumeric(8)}`,
            config_value: RandomGenerator.paragraph({ sentences: 1 }),
            value_type: RandomGenerator.pick([
              "string",
              "integer",
              "boolean",
              "float",
            ] as const),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ITodoListSystemConfig.ICreate,
        });
      typia.assert(config);
      return config;
    },
  );

  // Validate all created entries have version 1
  for (const entry of configEntries) {
    TestValidator.equals(
      "newly created config should have version 1",
      entry.version,
      1,
    );
  }

  // 3. Search for configuration entries with version filter
  const versionOneSearchResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        version: 1,
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(versionOneSearchResult);

  // 4. Validate version 1 filter returns correct results
  TestValidator.predicate(
    "version 1 filter should return entries",
    versionOneSearchResult.data.length > 0,
  );

  // Verify all returned entries have version 1
  for (const config of versionOneSearchResult.data) {
    TestValidator.equals(
      "filtered results should only contain version 1 entries",
      config.version,
      1,
    );
  }

  // 5. Verify pagination information
  TestValidator.equals(
    "pagination should start at page 1",
    versionOneSearchResult.pagination.current,
    1,
  );

  TestValidator.predicate(
    "page limit should be 10",
    versionOneSearchResult.pagination.limit === 10,
  );

  TestValidator.predicate(
    "total records should be available",
    versionOneSearchResult.pagination.records >= 0,
  );

  // 6. Test with limit filtering
  const limitedSearch: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 2,
        version: 1,
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(limitedSearch);

  TestValidator.predicate(
    "limited search should respect page limit",
    limitedSearch.data.length <= 2,
  );

  TestValidator.equals(
    "limited search pagination limit should be 2",
    limitedSearch.pagination.limit,
    2,
  );
}
