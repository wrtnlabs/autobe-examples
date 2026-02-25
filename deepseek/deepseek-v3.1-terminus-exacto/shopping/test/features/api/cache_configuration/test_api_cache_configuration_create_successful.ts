import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";

/**
 * Test successful creation of a Redis cache configuration with proper authentication.
 * Administrator joins system, then creates cache configuration with unique cache_key 'redis.session',
 * type 'redis', JSON configuration values including TTL settings, priority 5, and active status.
 * Verify configuration is created with system-generated ID and timestamps, and snapshot audit trail is maintained.
 */
export async function test_api_cache_configuration_create_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123" satisfies string &
        tags.Format<"password"> as string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create Redis cache configuration
  const cacheConfig =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: "redis.session",
          cache_type: "redis",
          configuration_value: JSON.stringify({
            host: "localhost",
            port: 6379,
            ttl: 3600,
            max_connections: 100,
          }),
          description: "Redis session cache configuration" satisfies
            | string
            | null as string | null,
          is_active: true,
          priority: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<10> as number satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<10> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<10>,
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(cacheConfig);
  // 3. Validate essential business logic (not redundant type validation)
  TestValidator.equals(
    "cache key matches",
    cacheConfig.cache_key,
    "redis.session",
  );
  TestValidator.equals("cache type matches", cacheConfig.cache_type, "redis");
  TestValidator.equals("is active matches", cacheConfig.is_active, true);
  TestValidator.equals("priority matches", cacheConfig.priority, 5);
}
