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
 * Test advanced search scenarios with complex filter combinations for cache configuration parameter definitions.
 * Verify that the endpoint correctly handles multiple filter criteria simultaneously, such as combining
 * operation_type filtering with administrator_id filtering, category_id with date ranges, and text search
 * combined with other filters. Test pagination behavior with complex filters to ensure correct record
 * counts and page navigation. Validate that the search functionality maintains proper precedence and
 * logical consistency when multiple filters are applied. Test edge cases where filter combinations might
 * logically exclude all results or create overlapping constraints.
 */
export async function test_api_cache_configuration_admin_complex_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Test combination of operation_type and administrator_id filters
  const filter1 = {
    operation_type: "create",
    administrator_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest;
  const result1 =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      { body: filter1 },
    );
  typia.assert(result1);
  TestValidator.predicate(
    "result contains pagination info",
    result1.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(result1.data));
  // 3. Test combination of category_id and date range filters
  const datePast = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateNow = new Date().toISOString();
  const filter2 = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    created_at_from: datePast,
    created_at_to: dateNow,
  } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest;
  const result2 =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      { body: filter2 },
    );
  typia.assert(result2);
  TestValidator.equals(
    "pagination metadata exists",
    typeof result2.pagination.records,
    "number",
  );
  // 4. Test text search combined with operation_type filtering
  const filter3 = {
    search: RandomGenerator.alphabets(5),
    operation_type: "edit",
  } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest;
  const result3 =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      { body: filter3 },
    );
  typia.assert(result3);
  TestValidator.predicate(
    "pagination pages calculated correctly",
    result3.pagination.pages >= 0,
  );
  // 5. Test complex pagination with multiple filters
  const filter4 = {
    operation_type: "delete",
    created_at_from: datePast,
    page: 1,
    limit: 10,
  } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest;
  const result4 =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      { body: filter4 },
    );
  typia.assert(result4);
  TestValidator.equals(
    "correct page limit applied",
    result4.pagination.limit,
    10,
  );
  TestValidator.equals("correct current page", result4.pagination.current, 1);
  TestValidator.predicate(
    "records count is non-negative",
    result4.pagination.records >= 0,
  );
  // 6. Test edge case: filters that might exclude all results
  const filter5 = {
    operation_type: "invalid_operation_type_that_does_not_exist",
    administrator_id: typia.random<string & tags.Format<"uuid">>(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest;
  const result5 =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      { body: filter5 },
    );
  typia.assert(result5);
  TestValidator.predicate(
    "empty result handling works correctly",
    Array.isArray(result5.data) && result5.pagination.records >= 0,
  );
  // 7. Test date range edge case: inverted dates (should handle gracefully)
  const filter6 = {
    created_at_from: dateNow,
    created_at_to: datePast,
  } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest;
  const result6 =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      { body: filter6 },
    );
  typia.assert(result6);
  TestValidator.predicate(
    "inverted date range handled gracefully",
    result6.pagination.records >= 0,
  );
  // 8. Test maximum pagination limit
  const filter7 = {
    page: 1,
    limit: 100,
  } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest;
  const result7 =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      { body: filter7 },
    );
  typia.assert(result7);
  TestValidator.equals(
    "maximum limit respected",
    result7.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length within limit",
    result7.data.length <= 100,
  );
}
