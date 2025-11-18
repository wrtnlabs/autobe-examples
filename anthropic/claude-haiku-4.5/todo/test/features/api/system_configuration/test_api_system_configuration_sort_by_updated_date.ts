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
 * Test sorting system configurations by last modification date.
 *
 * This test validates that system configuration entries can be properly sorted
 * by their updated_at timestamp. It creates multiple configuration entries,
 * then retrieves them in both ascending and descending order to ensure the
 * sorting functionality works correctly.
 *
 * Test steps:
 *
 * 1. Authenticate user to access system configuration endpoints
 * 2. Create multiple system configuration entries with different timestamps
 * 3. Retrieve configurations sorted by updated_at in ascending order
 * 4. Verify entries are ordered chronologically (oldest first)
 * 5. Retrieve configurations sorted by updated_at in descending order
 * 6. Verify entries are ordered reverse chronologically (newest first)
 * 7. Validate sort order is consistent regardless of creation sequence
 */
export async function test_api_system_configuration_sort_by_updated_date(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple configuration entries
  const configs: ITodoListSystemConfig[] = [];

  // Create first configuration
  const config1: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
        config_value: "value1",
        value_type: "string",
        description: "First configuration entry for sorting test",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config1);
  configs.push(config1);

  // Add delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create second configuration
  const config2: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
        config_value: "value2",
        value_type: "integer",
        description: "Second configuration entry for sorting test",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config2);
  configs.push(config2);

  // Add delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create third configuration
  const config3: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
        config_value: "value3",
        value_type: "boolean",
        description: "Third configuration entry for sorting test",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config3);
  configs.push(config3);

  // Step 3: Query configurations sorted by updated_at in ascending order
  const ascendingResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "updated_at",
        order: "asc",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(ascendingResult);

  // Step 4: Verify ascending order (oldest first)
  TestValidator.predicate(
    "ascending order should have data",
    ascendingResult.data.length > 0,
  );

  // Check that created configs appear in ascending order
  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const current = ascendingResult.data[i];
    const next = ascendingResult.data[i + 1];
    TestValidator.predicate(
      `ascending order: config at index ${i} updated_at should be <= config at index ${i + 1}`,
      new Date(current.updated_at) <= new Date(next.updated_at),
    );
  }

  // Step 5: Query configurations sorted by updated_at in descending order
  const descendingResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "updated_at",
        order: "desc",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(descendingResult);

  // Step 6: Verify descending order (newest first)
  TestValidator.predicate(
    "descending order should have data",
    descendingResult.data.length > 0,
  );

  // Check that created configs appear in descending order
  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const current = descendingResult.data[i];
    const next = descendingResult.data[i + 1];
    TestValidator.predicate(
      `descending order: config at index ${i} updated_at should be >= config at index ${i + 1}`,
      new Date(current.updated_at) >= new Date(next.updated_at),
    );
  }

  // Step 7: Verify consistency between ascending and descending results
  TestValidator.equals(
    "ascending and descending results should have same count",
    ascendingResult.data.length,
    descendingResult.data.length,
  );

  // Verify that the first item in ascending is the last in descending (and vice versa)
  if (ascendingResult.data.length > 0) {
    const firstAsc = ascendingResult.data[0];
    const lastDesc = descendingResult.data[descendingResult.data.length - 1];
    TestValidator.equals(
      "first in ascending should match last in descending",
      firstAsc.id,
      lastDesc.id,
    );
  }

  // Verify that the last item in ascending is the first in descending
  if (ascendingResult.data.length > 0) {
    const lastAsc = ascendingResult.data[ascendingResult.data.length - 1];
    const firstDesc = descendingResult.data[0];
    TestValidator.equals(
      "last in ascending should match first in descending",
      lastAsc.id,
      firstDesc.id,
    );
  }
}
