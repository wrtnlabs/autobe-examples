import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfiguration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configuration_query_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for configuration query
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test 1: Query with empty result (non-matching filter)
  const emptyResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          config_key: "non_existent_key_12345",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result count", emptyResult.data.length, 0);
  TestValidator.equals(
    "pagination records for empty",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for empty",
    emptyResult.pagination.pages,
    0,
  );
  // Test 2: Query with category filter
  const categoryResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          category: "payment",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(categoryResult);
  // Test 3: Query with is_enabled filter
  const enabledResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          is_enabled: true,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(enabledResult);
  // Test 4: Query with partial config_key match
  const keyResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          config_key: "test_config",
          page: 1,
          limit: 15,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(keyResult);
  // Test 5: Query with pagination boundary (large page size)
  const largePageResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(largePageResult);
  // Test 6: Query with sorting by created_at ascending
  const sortCreatedAscResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(sortCreatedAscResult);
  // Test 7: Query with sorting by config_key descending
  const sortKeyDescResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          sort_by: "config_key",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(sortKeyDescResult);
  // Test 8: Query with multiple filter combinations
  const multiFilterResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          config_key: "config",
          category: "shipping",
          is_enabled: false,
          page: 1,
          limit: 5,
          sort_by: "updated_at",
          sort_order: "desc",
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(multiFilterResult);
  // Test 9: Verify pagination metadata structure
  const paginationResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata structure
  typia.assert<{
    current: number;
    limit: number;
    records: number;
    pages: number;
  }>(paginationResult.pagination);
  // Test 10: Edge case - single record page
  const singlePageResult =
    await api.functional.shoppingMall.admin.configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSystemConfiguration.IRequest,
      },
    );
  typia.assert(singlePageResult);
  TestValidator.predicate(
    "single page has data or is empty",
    singlePageResult.data.length <= 1,
  );
}
