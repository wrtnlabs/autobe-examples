import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cache_configuration_parameter_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  
  // Authenticate as administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
    } satisfies IEcommerceAdministrator.IJoin,
  });

  // Create a cache configuration ID
  const configId = typia.random<string & tags.Format<"uuid">>();

  // Test various date range filtering scenarios
  const now = new Date();

  // Test 1: Filter by recent date range (last 3 hours)
  const recentStart = new Date(now.getTime() - (3 * 60 * 60 * 1000)).toISOString();
  const recentEnd = now.toISOString();

  const recentResults = await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
    adminConnection,
    {
      configId,
      body: {
        collection_timestamp_start: recentStart,
        collection_timestamp_end: recentEnd,
        page: 1,
        limit: 10,
      } satisfies IEcommerceCacheConfigurationParameter.IRequest,
    },
  );
  typia.assert(recentResults);

  // Validate pagination structure
  TestValidator.predicate(
    "recent results pagination structure valid",
    recentResults.pagination.records >= 0 && 
    recentResults.pagination.pages >= 0 && 
    recentResults.pagination.current >= 0 && 
    recentResults.pagination.limit > 0,
  );

  // Test 2: Filter by specific date range
  const specificStart = new Date(now.getTime() - (5 * 60 * 60 * 1000)).toISOString();
  const specificEnd = new Date(now.getTime() - (4 * 60 * 60 * 1000)).toISOString();

  const specificResults = await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
    adminConnection,
    {
      configId,
      body: {
        collection_timestamp_start: specificStart,
        collection_timestamp_end: specificEnd,
        page: 1,
        limit: 10,
      } satisfies IEcommerceCacheConfigurationParameter.IRequest,
    },
  );
  typia.assert(specificResults);

  // Test 3: Filter with future date range (should return empty results)
  const futureStart = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString();
  const futureEnd = new Date(now.getTime() + (25 * 60 * 60 * 1000)).toISOString();

  const futureResults = await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
    adminConnection,
    {
      configId,
      body: {
        collection_timestamp_start: futureStart,
        collection_timestamp_end: futureEnd,
        page: 1,
        limit: 10,
      } satisfies IEcommerceCacheConfigurationParameter.IRequest,
    },
  );
  typia.assert(futureResults);

  // Test 4: Filter with reversed date range (end before start)
  const reversedResults = await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
    adminConnection,
    {
      configId,
      body: {
        collection_timestamp_start: specificEnd,
        collection_timestamp_end: specificStart,
        page: 1,
        limit: 10,
      } satisfies IEcommerceCacheConfigurationParameter.IRequest,
    },
  );
  typia.assert(reversedResults);

  // Test 5: Pagination validation with date filtering
  const paginatedResults = await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
    adminConnection,
    {
      configId,
      body: {
        collection_timestamp_start: recentStart,
        collection_timestamp_end: recentEnd,
        page: 1,
        limit: 5,
      } satisfies IEcommerceCacheConfigurationParameter.IRequest,
    },
  );
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination limit enforced",
    paginatedResults.data.length <= 5,
  );

  // Test 6: Filter without date range (should return all)
  const allResults = await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
    adminConnection,
    {
      configId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceCacheConfigurationParameter.IRequest,
    },
  );
  typia.assert(allResults);
}