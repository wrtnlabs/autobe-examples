import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";

export async function test_api_cache_configuration_duplicate_key_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
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
  // Create first cache configuration with memory type
  const cacheKey = RandomGenerator.alphabets(16);
  const firstConfig =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {
        body: {
          cache_key: cacheKey,
          cache_type: "memory",
          configuration_value: JSON.stringify({ ttl: 3600, maxEntries: 1000 }),
          description: "Memory cache for session storage",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(firstConfig);
  // Verify first configuration was created successfully
  TestValidator.notEquals("configuration ID is generated", firstConfig.id, "");
  TestValidator.equals(
    "cache key matches input",
    firstConfig.cache_key,
    cacheKey,
  );
  TestValidator.equals(
    "cache type is memory",
    firstConfig.cache_type,
    "memory",
  );
  TestValidator.predicate(
    "configuration is active",
    firstConfig.is_active === true,
  );
  // Attempt to create duplicate cache configuration with same key
  await TestValidator.error("duplicate cache key rejection", async () => {
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {
        body: {
          cache_key: cacheKey,
          cache_type: "redis",
          configuration_value: JSON.stringify({
            host: "localhost",
            port: 6379,
          }),
          description: "Redis cache for product catalog",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  });
  // Verify original configuration remains unchanged
  TestValidator.equals("cache key unchanged", firstConfig.cache_key, cacheKey);
  TestValidator.equals(
    "cache type unchanged",
    firstConfig.cache_type,
    "memory",
  );
  TestValidator.predicate(
    "original config still active",
    firstConfig.is_active === true,
  );
  TestValidator.predicate(
    "original priority unchanged",
    firstConfig.priority > 0,
  );
}
