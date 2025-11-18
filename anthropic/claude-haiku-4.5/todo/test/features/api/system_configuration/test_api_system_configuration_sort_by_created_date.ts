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
 * Test sorting system configurations by creation date.
 *
 * This test verifies that system configuration entries can be retrieved in the
 * correct chronological order when sorted by created_at timestamp. The scenario
 * includes:
 *
 * 1. User authentication to establish a valid session
 * 2. Creation of multiple system configuration entries with timestamps
 * 3. Retrieval of configurations sorted by created_at in ascending order (oldest
 *    first)
 * 4. Retrieval of configurations sorted by created_at in descending order (newest
 *    first)
 * 5. Validation that entries are returned in the correct order based on sort_by
 *    and order parameters
 */
export async function test_api_system_configuration_sort_by_created_date(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple system configuration entries
  const configs: ITodoListSystemConfig[] = [];
  const configKeys = [
    "max_todos_per_user",
    "token_expiration_minutes",
    "enable_feature_flag_beta",
    "deployment_environment",
  ];

  for (let i = 0; i < configKeys.length; i++) {
    const config: ITodoListSystemConfig =
      await api.functional.todoList.systemConfigurations.create(connection, {
        body: {
          config_key: `${configKeys[i]}_${RandomGenerator.alphaNumeric(8)}`,
          config_value: String(1000 + i),
          value_type: "integer",
          description: `Configuration entry ${i + 1} for sorting test`,
        } satisfies ITodoListSystemConfig.ICreate,
      });
    typia.assert(config);
    configs.push(config);

    // Add small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Retrieve configurations sorted by created_at in ascending order (oldest first)
  const ascendingResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 50,
        sort_by: "created_at",
        order: "asc",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(ascendingResult);

  // Validate ascending order
  const ascendingConfigs = ascendingResult.data;
  for (let i = 1; i < ascendingConfigs.length; i++) {
    TestValidator.predicate(
      "configurations in ascending order by created_at",
      new Date(ascendingConfigs[i - 1].created_at) <=
        new Date(ascendingConfigs[i].created_at),
    );
  }

  // Step 4: Retrieve configurations sorted by created_at in descending order (newest first)
  const descendingResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 50,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(descendingResult);

  // Validate descending order
  const descendingConfigs = descendingResult.data;
  for (let i = 1; i < descendingConfigs.length; i++) {
    TestValidator.predicate(
      "configurations in descending order by created_at",
      new Date(descendingConfigs[i - 1].created_at) >=
        new Date(descendingConfigs[i].created_at),
    );
  }

  // Step 5: Verify that ascending and descending results are reverses of each other
  TestValidator.equals(
    "total configuration count matches",
    ascendingResult.pagination.records,
    descendingResult.pagination.records,
  );

  // Verify the first ascending entry matches the last descending entry
  if (ascendingConfigs.length > 0 && descendingConfigs.length > 0) {
    TestValidator.equals(
      "oldest configuration in ascending matches newest in descending",
      ascendingConfigs[0].id,
      descendingConfigs[descendingConfigs.length - 1].id,
    );

    TestValidator.equals(
      "newest configuration in ascending matches oldest in descending",
      ascendingConfigs[ascendingConfigs.length - 1].id,
      descendingConfigs[0].id,
    );
  }
}
