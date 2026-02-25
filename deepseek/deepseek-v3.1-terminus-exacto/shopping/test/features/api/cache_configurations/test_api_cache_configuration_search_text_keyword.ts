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

export async function test_api_cache_configuration_search_text_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test 1: Search for configurations using description keyword
  const searchResults1 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.index(
      superAdminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          parameter_name: "",
          parameter_value: "",
          data_type: "string",
          description: "cache",
          created_at: new Date().toISOString(),
        } satisfies IEcommerceCacheConfigurationParameter,
      },
    );
  typia.assert(searchResults1);
  // Verify search returns results
  TestValidator.predicate(
    "search should return valid page structure",
    searchResults1.pagination !== undefined &&
      Array.isArray(searchResults1.data),
  );
  // Test 2: Search with specific parameter name
  const searchResults2 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.index(
      superAdminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          parameter_name: "redis",
          parameter_value: "",
          data_type: "string",
          description: "",
          created_at: new Date().toISOString(),
        } satisfies IEcommerceCacheConfigurationParameter,
      },
    );
  typia.assert(searchResults2);
  // Test 3: Test pagination with combined search
  const searchResults3 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.index(
      superAdminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          parameter_name: "memory",
          parameter_value: "",
          data_type: "string",
          description: "troubleshooting",
          created_at: new Date().toISOString(),
        } satisfies IEcommerceCacheConfigurationParameter,
      },
    );
  typia.assert(searchResults3);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination metadata should be valid",
    searchResults3.pagination.current >= 0 &&
      searchResults3.pagination.limit >= 0 &&
      searchResults3.pagination.records >= 0 &&
      searchResults3.pagination.pages >= 0,
  );
  // Verify search results structure
  if (searchResults1.data.length > 0) {
    const config = searchResults1.data[0];
    TestValidator.predicate(
      "configuration should have cache_key field",
      typeof config.cache_key === "string",
    );
    TestValidator.predicate(
      "configuration should have cache_type field",
      typeof config.cache_type === "string",
    );
    TestValidator.predicate(
      "configuration should have is_active field",
      typeof config.is_active === "boolean",
    );
    TestValidator.predicate(
      "configuration should have priority field",
      typeof config.priority === "number",
    );
  }
}
