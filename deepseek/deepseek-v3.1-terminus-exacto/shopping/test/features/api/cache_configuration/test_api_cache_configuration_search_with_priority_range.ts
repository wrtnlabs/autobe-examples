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

/**
 * Test searching cache configurations using priority range filtering.
 * Scenario: As a super administrator tuning platform performance, I need to find
 * high-priority cache configurations that impact critical system areas.
 * Steps: 1) Authenticate as super administrator 2) Search cache configurations
 * with priority range (e.g., 1-5) to focus on high-impact settings 3) Verify
 * results include only configurations within the specified priority range
 * 4) Test pagination behavior with different page sizes 5) Validate response
 * structure includes cache_key, cache_type, priority, and creation timestamp.
 * This tests the range-based filtering capability that administrators use for
 * performance optimization workflows.
 */
export async function test_api_cache_configuration_search_with_priority_range(
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
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Prepare search criteria for priority range 1-5
  const searchCriteria = {
    id: typia.random<string & tags.Format<"uuid">>(),
    parameter_name: "priority",
    parameter_value: "1-5",
    data_type: "range",
    description: "Search configurations with priority range 1-5",
    created_at: new Date().toISOString(),
  } satisfies IEcommerceCacheConfigurationParameter;
  // 3. Execute cache configuration search with priority range filtering
  // 🚨 CRITICAL: No utility function exists for this endpoint, using SDK directly as required
  const responsePage1 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.index(
      superAdminConnection,
      {
        body: searchCriteria,
      },
    );
  typia.assert(responsePage1);
  // 4. Validate response structure and priority range
  TestValidator.equals(
    "has pagination object",
    typeof responsePage1.pagination,
    "object",
  );
  TestValidator.predicate(
    "has valid current page",
    () => responsePage1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has valid records count",
    () => responsePage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    () => responsePage1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "has valid page limit",
    () => responsePage1.pagination.limit > 0,
  );
  // 5. Validate response data structure
  if (responsePage1.data.length > 0) {
    const firstConfig = responsePage1.data[0];
    typia.assert(firstConfig);
    TestValidator.equals("config has id", typeof firstConfig.id, "string");
    TestValidator.equals(
      "config has cache_key",
      typeof firstConfig.cache_key,
      "string",
    );
    TestValidator.equals(
      "config has cache_type",
      typeof firstConfig.cache_type,
      "string",
    );
    TestValidator.equals(
      "config has is_active",
      typeof firstConfig.is_active,
      "boolean",
    );
    TestValidator.equals(
      "config has priority",
      typeof firstConfig.priority,
      "number",
    );
    TestValidator.equals(
      "config has created_at",
      typeof firstConfig.created_at,
      "string",
    );
    // 6. Verify priority values are within range 1-5
    for (const config of responsePage1.data) {
      TestValidator.predicate(
        `priority ${config.priority} is within range 1-5`,
        config.priority >= 1 && config.priority <= 5,
      );
    }
  }
  // 7. Test basic pagination metadata (since no utility functions available for pagination testing)
  TestValidator.predicate(
    "pagination metadata is consistent",
    responsePage1.pagination.pages ===
      Math.ceil(
        responsePage1.pagination.records / responsePage1.pagination.limit,
      ) || responsePage1.pagination.records === 0,
  );
}
