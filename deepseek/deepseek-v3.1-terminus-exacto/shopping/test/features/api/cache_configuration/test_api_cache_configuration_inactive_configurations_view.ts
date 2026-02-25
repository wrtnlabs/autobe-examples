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
 * Test administrator search for inactive cache configurations.
 *
 * This test verifies the maintenance workflow where administrators audit
 * deactivated cache configurations. It searches for configurations with
 * is_active=false to identify unused settings that may need cleanup.
 */
export async function test_api_cache_configuration_inactive_configurations_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator (using SDK since utility not available)
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerce.auth.administrator.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        typia.random<string & tags.Format<"password">>() || "test_password_123",
    },
  });
  // 2. Search for inactive cache configurations
  const searchResult =
    await api.functional.ecommerce.administrator.cache_configurations.index(
      adminConnection,
      {
        body: {
          is_active: false,
          limit: 10 satisfies number as number,
          page: 1,
        } satisfies IEcommerceCacheConfiguration.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate all configurations are inactive
  searchResult.data.forEach((config, index) => {
    TestValidator.equals(
      `configuration ${index} should be inactive`,
      config.is_active,
      false,
    );
  });
  // 4. Validate essential summary fields present
  searchResult.data.forEach((config, index) => {
    TestValidator.predicate(
      `configuration ${index} should have cache_key`,
      typeof config.cache_key === "string" && config.cache_key.length > 0,
    );
    TestValidator.predicate(
      `configuration ${index} should have cache_type`,
      typeof config.cache_type === "string" && config.cache_type.length > 0,
    );
    TestValidator.predicate(
      `configuration ${index} should have valid priority`,
      config.priority >= 1 && config.priority <= 10,
    );
    TestValidator.predicate(
      `configuration ${index} should have created_at`,
      typeof config.created_at === "string" && config.created_at.length > 0,
    );
  });
  // 5. Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    searchResult.pagination.pages >= 0,
  );
}
