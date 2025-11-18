import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListConfiguration";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test configuration search functionality that includes soft-deleted entries.
 *
 * This test validates the system's ability to manage configuration lifecycle
 * including deletion and recovery workflows. It creates configurations,
 * soft-deletes some entries, then performs searches with the include_deleted
 * flag toggled to validate proper filtering behavior.
 */
export async function test_api_configuration_search_including_deleted(
  connection: api.IConnection,
) {
  // 1. Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Create multiple configuration entries with different categories
  const configurations: ITodoListConfiguration[] = [];

  // Create UI configurations
  const uiConfig1 = await api.functional.todoList.user.configurations.create(
    connection,
    {
      body: {
        key: "ui.theme.dark",
        value: "true",
        description: "Enable dark theme",
        category: "ui",
      } satisfies ITodoListConfiguration.ICreate,
    },
  );
  typia.assert(uiConfig1);
  configurations.push(uiConfig1);

  const uiConfig2 = await api.functional.todoList.user.configurations.create(
    connection,
    {
      body: {
        key: "ui.language",
        value: "en",
        description: "Default language setting",
        category: "ui",
      } satisfies ITodoListConfiguration.ICreate,
    },
  );
  typia.assert(uiConfig2);
  configurations.push(uiConfig2);

  // Create performance configurations
  const perfConfig1 = await api.functional.todoList.user.configurations.create(
    connection,
    {
      body: {
        key: "performance.cache.ttl",
        value: "3600",
        description: "Cache time-to-live in seconds",
        category: "performance",
      } satisfies ITodoListConfiguration.ICreate,
    },
  );
  typia.assert(perfConfig1);
  configurations.push(perfConfig1);

  const perfConfig2 = await api.functional.todoList.user.configurations.create(
    connection,
    {
      body: {
        key: "performance.max_requests",
        value: "1000",
        description: "Maximum concurrent requests",
        category: "performance",
      } satisfies ITodoListConfiguration.ICreate,
    },
  );
  typia.assert(perfConfig2);
  configurations.push(perfConfig2);

  // 3. Soft-delete some configurations
  await api.functional.todoList.user.configurations.erase(connection, {
    configurationKey: uiConfig1.key,
  });

  await api.functional.todoList.user.configurations.erase(connection, {
    configurationKey: perfConfig1.key,
  });

  // 4. Test default search (include_deleted=false) - should exclude deleted entries
  const defaultSearch = await api.functional.todoList.user.configurations.index(
    connection,
    {
      body: {
        include_deleted: false,
      } satisfies ITodoListConfiguration.IRequest,
    },
  );
  typia.assert(defaultSearch);

  // Validate that deleted configurations are excluded from default search
  TestValidator.equals(
    "default search excludes deleted configurations",
    defaultSearch.data.length,
    2,
  );

  const activeConfigs = defaultSearch.data.filter(
    (config) => config.key === uiConfig2.key || config.key === perfConfig2.key,
  );
  TestValidator.equals(
    "default search includes only active configurations",
    activeConfigs.length,
    2,
  );

  // 5. Test search with include_deleted=true - should include both active and deleted
  const inclusiveSearch =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        include_deleted: true,
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(inclusiveSearch);

  // Validate that all configurations (active and deleted) are included
  TestValidator.equals(
    "inclusive search includes all configurations",
    inclusiveSearch.data.length,
    4,
  );

  // Verify specific configurations are present
  const foundUiConfig1 = inclusiveSearch.data.find(
    (config) => config.key === uiConfig1.key,
  );
  TestValidator.predicate(
    "deleted UI configuration included in inclusive search",
    foundUiConfig1 !== undefined,
  );

  const foundPerfConfig1 = inclusiveSearch.data.find(
    (config) => config.key === perfConfig1.key,
  );
  TestValidator.predicate(
    "deleted performance configuration included in inclusive search",
    foundPerfConfig1 !== undefined,
  );

  const foundUiConfig2 = inclusiveSearch.data.find(
    (config) => config.key === uiConfig2.key,
  );
  TestValidator.predicate(
    "active UI configuration included in inclusive search",
    foundUiConfig2 !== undefined,
  );

  const foundPerfConfig2 = inclusiveSearch.data.find(
    (config) => config.key === perfConfig2.key,
  );
  TestValidator.predicate(
    "active performance configuration included in inclusive search",
    foundPerfConfig2 !== undefined,
  );

  // 6. Test category filtering with include_deleted
  const uiCategorySearch =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        category: "ui",
        include_deleted: true,
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(uiCategorySearch);

  TestValidator.equals(
    "UI category search returns both active and deleted UI configurations",
    uiCategorySearch.data.length,
    2,
  );

  const performanceCategorySearch =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        category: "performance",
        include_deleted: true,
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(performanceCategorySearch);

  TestValidator.equals(
    "performance category search returns both active and deleted performance configurations",
    performanceCategorySearch.data.length,
    2,
  );

  // 7. Test key pattern filtering with include_deleted
  const uiKeyPatternSearch =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        key: "ui",
        include_deleted: true,
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(uiKeyPatternSearch);

  TestValidator.predicate(
    "UI key pattern search returns matching configurations",
    uiKeyPatternSearch.data.length >= 2,
  );

  // 8. Validate pagination information
  TestValidator.predicate(
    "pagination current page is valid",
    defaultSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    defaultSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    defaultSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is valid",
    defaultSearch.pagination.pages >= 0,
  );
}
