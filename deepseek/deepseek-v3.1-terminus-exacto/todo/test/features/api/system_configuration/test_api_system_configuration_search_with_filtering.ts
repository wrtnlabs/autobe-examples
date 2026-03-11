import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the system configuration search functionality with various filtering criteria.
 * Validate that administrators can search, filter, and paginate through system configurations
 * using criteria like config_key, scope, data_type, and is_active status.
 */
export async function test_api_system_configuration_search_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // Test 1: Default search (empty request)
  const defaultSearch =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {} satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.predicate(
    "default search returns pagination metadata",
    defaultSearch.pagination.limit > 0,
  );
  TestValidator.predicate("data is array", Array.isArray(defaultSearch.data));
  // Test 2: Search by config_key (exact match)
  const configKey = RandomGenerator.alphabets(10);
  const configKeySearch =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          config_key: configKey,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(configKeySearch);
  // Test 3: Filter by scope
  const scopes = ["global", "component", "environment"] as const;
  const scope = RandomGenerator.pick(scopes);
  const scopeSearch =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          scope: scope,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(scopeSearch);
  // Verify all returned items match scope filter
  for (const item of scopeSearch.data) {
    TestValidator.equals("item scope matches filter", item.scope, scope);
  }
  // Test 4: Filter by data_type
  const dataTypes = ["string", "number", "boolean", "json"] as const;
  const dataType = RandomGenerator.pick(dataTypes);
  const dataTypeSearch =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          data_type: dataType,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(dataTypeSearch);
  for (const item of dataTypeSearch.data) {
    TestValidator.equals(
      "item data_type matches filter",
      item.data_type,
      dataType,
    );
  }
  // Test 5: Filter by is_active
  const isActiveSearch =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(isActiveSearch);
  for (const item of isActiveSearch.data) {
    TestValidator.equals("item is_active matches filter", item.is_active, true);
  }
  // Test 6: Combined filters
  const combinedSearch =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          scope: "global",
          data_type: "string",
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(combinedSearch);
  for (const item of combinedSearch.data) {
    TestValidator.equals(
      "combined filter: scope matches",
      item.scope,
      "global",
    );
    TestValidator.equals(
      "combined filter: data_type matches",
      item.data_type,
      "string",
    );
    TestValidator.equals(
      "combined filter: is_active matches",
      item.is_active,
      true,
    );
  }
  // Test 7: Pagination with specific page and limit
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const paginationSearch =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: page,
          limit: limit,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(paginationSearch);
  TestValidator.equals(
    "pagination: current page matches",
    paginationSearch.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination: limit matches",
    paginationSearch.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination: records is non-negative",
    paginationSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination: pages is non-negative",
    paginationSearch.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination: data length ≤ limit",
    paginationSearch.data.length <= limit,
  );
  // Test 8: Search with keyword term
  const searchTerm = RandomGenerator.alphabets(5);
  const keywordSearch =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // Test 9: Verify all ISummary fields exist and are properly typed
  if (defaultSearch.data.length > 0) {
    const sampleItem = defaultSearch.data[0];
    // Verify all required fields from ISummary DTO
    TestValidator.predicate(
      "has required id field",
      typeof sampleItem.id === "string" && sampleItem.id.length > 0,
    );
    TestValidator.predicate(
      "has required config_key field",
      typeof sampleItem.config_key === "string",
    );
    TestValidator.predicate(
      "has required scope field",
      typeof sampleItem.scope === "string",
    );
    TestValidator.predicate(
      "has required data_type field",
      typeof sampleItem.data_type === "string",
    );
    TestValidator.predicate(
      "has required is_active field",
      typeof sampleItem.is_active === "boolean",
    );
    TestValidator.predicate(
      "has required version field",
      typeof sampleItem.version === "number" &&
        Number.isInteger(sampleItem.version),
    );
    TestValidator.predicate(
      "has required created_at field",
      typeof sampleItem.created_at === "string" &&
        sampleItem.created_at.length > 0,
    );
    TestValidator.predicate(
      "has required updated_at field",
      typeof sampleItem.updated_at === "string" &&
        sampleItem.updated_at.length > 0,
    );
  }
}
