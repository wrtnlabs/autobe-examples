import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameterDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that administrators can successfully search and filter cache configuration parameter definitions with various filter combinations.
 */
export async function test_api_cache_configuration_admin_filter_parameter_definitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123" as string & tags.Format<"password">,
    },
  });
  typia.assert(adminAuth);
  // 2. Test empty search (get all parameter definitions)
  const emptySearchResponse =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.predicate(
    "empty search should return valid pagination",
    emptySearchResponse.pagination.records >= 0,
  );
  // 3. Test pagination with different page sizes
  const pageSizes = [10, 25, 50] as const;
  for (const limit of pageSizes) {
    const paginationResponse =
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
        adminConnection,
        {
          body: {
            page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
        },
      );
    typia.assert(paginationResponse);
    TestValidator.equals(
      `limit ${limit} should be respected`,
      paginationResponse.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page ${limit} data length should not exceed limit`,
      paginationResponse.data.length <= limit,
    );
  }
  // 4. Test search with operation_type filter if data exists
  // We need to check if there are any operation_types in the response to test
  if (emptySearchResponse.data.length > 0) {
    const sampleItem = emptySearchResponse.data[0];
    const operationTypeFilterResponse =
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
        adminConnection,
        {
          body: {
            operation_type: sampleItem.operation_type,
          } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
        },
      );
    typia.assert(operationTypeFilterResponse);
    // Verify all returned items match the operation_type filter
    for (const item of operationTypeFilterResponse.data) {
      TestValidator.equals(
        "operation_type should match filter",
        item.operation_type,
        sampleItem.operation_type,
      );
    }
  }
  // 5. Test administrator_id filter if administrator exists in data
  if (emptySearchResponse.data.length > 0) {
    const sampleItem = emptySearchResponse.data[0];
    const adminIdFilterResponse =
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
        adminConnection,
        {
          body: {
            administrator_id: sampleItem.administrator.id satisfies string &
              tags.Format<"uuid">,
          } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
        },
      );
    typia.assert(adminIdFilterResponse);
    // Verify all returned items match the administrator_id filter
    for (const item of adminIdFilterResponse.data) {
      TestValidator.equals(
        "administrator_id should match filter",
        item.administrator.id,
        sampleItem.administrator.id,
      );
    }
  }
  // 6. Test category_id filter if category exists in data
  if (emptySearchResponse.data.length > 0) {
    const sampleItem = emptySearchResponse.data[0];
    const categoryIdFilterResponse =
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
        adminConnection,
        {
          body: {
            category_id: sampleItem.category.id satisfies string &
              tags.Format<"uuid">,
          } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
        },
      );
    typia.assert(categoryIdFilterResponse);
    // Verify all returned items match the category_id filter
    for (const item of categoryIdFilterResponse.data) {
      TestValidator.equals(
        "category_id should match filter",
        item.category.id,
        sampleItem.category.id,
      );
    }
  }
  // 7. Test date range filtering (using current date as reference)
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateFilterResponse =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          created_at_from: pastDate satisfies string & tags.Format<"date-time">,
          created_at_to: currentDate satisfies string &
            tags.Format<"date-time">,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // Verify all returned items are within the date range
  for (const item of dateFilterResponse.data) {
    const itemDate = new Date(item.created_at).getTime();
    const fromDate = new Date(pastDate).getTime();
    const toDate = new Date(currentDate).getTime();
    TestValidator.predicate(
      "created_at should be within date range",
      itemDate >= fromDate && itemDate <= toDate,
    );
  }
  // 8. Test search text filter (partial matching)
  if (emptySearchResponse.data.length > 0) {
    const sampleItem = emptySearchResponse.data[0];
    // Extract a substring from operation_type for partial matching
    const searchTerm = sampleItem.operation_type.substring(0, 3);
    const searchFilterResponse =
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
        adminConnection,
        {
          body: {
            search: searchTerm,
          } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
        },
      );
    typia.assert(searchFilterResponse);
    // Note: Can't reliably test partial matching without knowing how search is implemented
    // We can only verify the response is valid
    TestValidator.predicate(
      "search filter should return valid response",
      searchFilterResponse.pagination.records >= 0,
    );
  }
  // 9. Test combined filters
  if (emptySearchResponse.data.length > 0) {
    const sampleItem = emptySearchResponse.data[0];
    const combinedFilterResponse =
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
        adminConnection,
        {
          body: {
            operation_type: sampleItem.operation_type,
            administrator_id: sampleItem.administrator.id satisfies string &
              tags.Format<"uuid">,
            page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
        },
      );
    typia.assert(combinedFilterResponse);
    // Verify all returned items match the combined filters
    for (const item of combinedFilterResponse.data) {
      TestValidator.equals(
        "combined filter: operation_type should match",
        item.operation_type,
        sampleItem.operation_type,
      );
      TestValidator.equals(
        "combined filter: administrator_id should match",
        item.administrator.id,
        sampleItem.administrator.id,
      );
    }
  }
  // 10. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination records should match data length on first page",
    emptySearchResponse.pagination.records >= emptySearchResponse.data.length,
  );
  if (emptySearchResponse.pagination.pages > 1) {
    TestValidator.predicate(
      "total pages should be calculated correctly",
      Math.ceil(
        emptySearchResponse.pagination.records /
          emptySearchResponse.pagination.limit,
      ) === emptySearchResponse.pagination.pages,
    );
  }
}
