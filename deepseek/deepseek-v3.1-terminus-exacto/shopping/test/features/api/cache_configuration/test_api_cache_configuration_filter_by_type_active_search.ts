import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator search for active Redis cache configurations with keyword matching.
 * 1. Administrator authentication using join endpoint
 * 2. Search for active Redis cache configurations with keyword filter
 * 3. Validate pagination metadata and response structure
 * 4. Verify all returned configurations match filter criteria
 */
export async function test_api_cache_configuration_filter_by_type_active_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(adminAuth);
  // 2. Prepare search criteria with Redis filter, active status, and keyword search
  const searchKeyword = RandomGenerator.alphabets(5);
  const searchBody: IEcommerceCacheConfiguration.IRequest = {
    search: searchKeyword,
    cache_type: "redis",
    is_active: true,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
    >(),
    page: 1,
  } satisfies IEcommerceCacheConfiguration.IRequest;
  // 3. Execute cache configuration search
  const result =
    await api.functional.ecommerce.administrator.cache_configurations.index(
      adminConnection,
      { body: searchBody },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  TestValidator.predicate(
    "limit matches request",
    result.pagination.limit === searchBody.limit,
  );
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Validate each returned cache configuration
  for (const config of result.data) {
    // Validate required fields exist
    typia.assert(config);
    // Validate cache_key contains search keyword (case-insensitive)
    TestValidator.predicate(
      `cache_key contains search term: ${config.cache_key}`,
      config.cache_key.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
    // Validate filter criteria
    TestValidator.equals(
      `cache_type is redis for ${config.id}`,
      config.cache_type,
      "redis",
    );
    TestValidator.equals(
      `is_active is true for ${config.id}`,
      config.is_active,
      true,
    );
    // Validate priority is within valid range (1-10)
    TestValidator.predicate(
      `priority is valid for ${config.id}`,
      config.priority >= 1 && config.priority <= 10,
    );
    // Validate created_at is valid date-time format
    TestValidator.predicate(
      `created_at is valid for ${config.id}`,
      !isNaN(Date.parse(config.created_at)),
    );
  }
  // 6. Validate total count consistency
  TestValidator.equals(
    "data length matches pagination limit",
    result.data.length,
    Math.min(result.pagination.records, searchBody.limit ?? 20),
  );
}