import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import type { ISortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ISortOrder";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_configuration_search_by_category(
  connection: api.IConnection,
) {
  // Create first user for authentication (first dependency)
  const user1Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    password_hash: "hashed_test_password",
    status: "active" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies ITodoAppUser.ICreate;

  const user1 = await api.functional.auth.user.join(connection, {
    body: user1Data,
  });
  typia.assert(user1);

  // Create second user for authentication (second dependency)
  const user2Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "anotherPassword456",
    password_hash: "hashed_another_password",
    status: "active" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies ITodoAppUser.ICreate;

  const user2 = await api.functional.auth.user.join(connection, {
    body: user2Data,
  });
  typia.assert(user2);

  // Test configuration search with category filtering
  const targetCategory = "ui_settings";
  const searchRequest = {
    category: targetCategory,
    page: 1,
    limit: 10,
    sort: "key" as const,
    order: "asc" as const,
  } satisfies ITodoAppConfiguration.IRequest;

  const searchResult = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchResult);

  // Validate pagination metadata with mathematical consistency
  TestValidator.equals(
    "pagination current page should be 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.predicate(
    "limit should be between 1 and 100",
    searchResult.pagination.limit >= 1 && searchResult.pagination.limit <= 100,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Validate pagination mathematical consistency
  if (searchResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      searchResult.pagination.records / searchResult.pagination.limit,
    );
    TestValidator.equals(
      "calculated pages should match pagination pages",
      searchResult.pagination.pages,
      expectedPages,
    );
  }

  // Validate that all returned configurations match the target category
  if (searchResult.pagination.records > 0) {
    searchResult.data.forEach((config) => {
      TestValidator.equals(
        `configuration ${config.key} should match category ${targetCategory}`,
        config.category,
        targetCategory,
      );
    });
  } else {
    // Test edge case: empty results for specific category
    TestValidator.equals(
      "data array should be empty when no records found",
      searchResult.data.length,
      0,
    );
  }

  // Test with different category
  const anotherCategory = "security_settings";
  const anotherSearchRequest = {
    category: anotherCategory,
    page: 1,
    limit: 5,
    sort: "category" as const,
    order: "desc" as const,
  } satisfies ITodoAppConfiguration.IRequest;

  const anotherResult = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: anotherSearchRequest,
    },
  );
  typia.assert(anotherResult);

  // Validate different category results
  if (anotherResult.pagination.records > 0) {
    anotherResult.data.forEach((config) => {
      TestValidator.equals(
        `configuration ${config.key} should match category ${anotherCategory}`,
        config.category,
        anotherCategory,
      );
    });
  }

  // Test without category filter (should return all categories)
  const allCategoriesRequest = {
    page: 1,
    limit: 10,
    sort: "created_at" as const,
    order: "asc" as const,
  } satisfies ITodoAppConfiguration.IRequest;

  const allCategoriesResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: allCategoriesRequest,
    });
  typia.assert(allCategoriesResult);

  // Validate structure and data types
  if (allCategoriesResult.pagination.records > 0) {
    allCategoriesResult.data.forEach((config) => {
      TestValidator.predicate(
        `configuration ${config.id} should have valid UUID format`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          config.id,
        ),
      );

      TestValidator.predicate(
        `configuration ${config.key} should have valid structure`,
        typeof config.key === "string" && config.key.length > 0,
      );

      TestValidator.predicate(
        `configuration ${config.category} should be valid string`,
        typeof config.category === "string" && config.category.length > 0,
      );

      TestValidator.predicate(
        `configuration ${config.data_type} should be valid data type`,
        ["boolean", "number", "string", "json", "array"].includes(
          config.data_type,
        ),
      );
    });
  }
}
