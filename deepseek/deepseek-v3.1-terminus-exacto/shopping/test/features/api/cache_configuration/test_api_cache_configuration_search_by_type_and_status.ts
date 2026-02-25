import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_cache_configuration_search_by_type_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Search for active Redis cache configurations
  const redisSearchBody = typia.random<IEcommerceCacheConfigurationParameter>();
  redisSearchBody.parameter_name = "cache_type";
  redisSearchBody.parameter_value = "redis";
  redisSearchBody.data_type = "string";
  redisSearchBody.description = "Search for active Redis configurations";
  const redisResult =
    await api.functional.ecommerce.superAdministrator.cache_configurations.index(
      superAdminConnection,
      { body: redisSearchBody },
    );
  typia.assert(redisResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    typeof redisResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page positive",
    redisResult.pagination.current >= 0,
  );
  TestValidator.predicate("limit positive", redisResult.pagination.limit >= 0);
  TestValidator.predicate(
    "records non-negative",
    redisResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    redisResult.pagination.pages >= 0,
  );
  // 4. Validate all Redis configurations match filter criteria
  for (const config of redisResult.data) {
    TestValidator.equals("cache type is redis", config.cache_type, "redis");
    TestValidator.equals("is active true", config.is_active, true);
  }
  // 5. Test different cache type to verify filtering
  const memorySearchBody = typia.random<IEcommerceCacheConfigurationParameter>();
  memorySearchBody.parameter_name = "cache_type";
  memorySearchBody.parameter_value = "memory";
  memorySearchBody.data_type = "string";
  memorySearchBody.description = "Search for active memory configurations";
  const memoryResult =
    await api.functional.ecommerce.superAdministrator.cache_configurations.index(
      superAdminConnection,
      { body: memorySearchBody },
    );
  typia.assert(memoryResult);
  // 6. Validate memory configurations
  for (const config of memoryResult.data) {
    TestValidator.equals("cache type is memory", config.cache_type, "memory");
    TestValidator.equals("is active true", config.is_active, true);
  }
  // 7. Additional validation: ensure Redis and memory results are distinct
  TestValidator.notEquals(
    "Redis and memory results should differ",
    redisResult.data.length,
    memoryResult.data.length,
  );
}