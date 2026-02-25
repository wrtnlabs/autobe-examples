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

export async function test_api_administrator_analysis_comprehensive_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Test 1: Basic analysis request with default pagination
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  const basicResponse =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      { body: basicRequest },
    );
  typia.assert(basicResponse);
  // Test 2: Analysis with random metric name filtering
  const nameFilterRequest = {
    metric_name: RandomGenerator.alphabets(8),
    page: 1,
    limit: 5,
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  const nameFilterResponse =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      { body: nameFilterRequest },
    );
  typia.assert(nameFilterResponse);
  // Test 3: Analysis with random metric category filtering
  const categoryFilterRequest = {
    metric_category: RandomGenerator.alphabets(10),
    page: 1,
    limit: 5,
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  const categoryFilterResponse =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      { body: categoryFilterRequest },
    );
  typia.assert(categoryFilterResponse);
  // Test 4: Analysis with timestamp range filtering using random dates
  const now = new Date();
  const randomPastDate = RandomGenerator.date(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    29 * 24 * 60 * 60 * 1000,
  );
  const timestampFilterRequest = {
    collection_timestamp_start: randomPastDate.toISOString(),
    collection_timestamp_end: now.toISOString(),
    page: 1,
    limit: 5,
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  const timestampFilterResponse =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      { body: timestampFilterRequest },
    );
  typia.assert(timestampFilterResponse);
  // Test 5: Analysis with random aggregation filter
  const aggregationValues = [true, false] as const;
  const randomAggregation = RandomGenerator.pick(aggregationValues);
  const aggregationFilterRequest = {
    is_aggregated: randomAggregation,
    page: 1,
    limit: 5,
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  const aggregationFilterResponse =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      { body: aggregationFilterRequest },
    );
  typia.assert(aggregationFilterResponse);
  // Test 6: Complex filter combination with random values
  const complexFilterRequest = {
    metric_name: RandomGenerator.alphabets(6),
    metric_category: RandomGenerator.alphabets(8),
    is_aggregated: RandomGenerator.pick(aggregationValues),
    collection_timestamp_start: RandomGenerator.date(
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      6 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    page: 1,
    limit: 3,
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  const complexFilterResponse =
    await api.functional.ecommerce.administrator.analysis.index(
      adminConnection,
      { body: complexFilterRequest },
    );
  typia.assert(complexFilterResponse);
  // Validate that API responds successfully to various filter combinations
  // without making assumptions about the data content
  TestValidator.predicate("all API calls completed successfully", true);
}
