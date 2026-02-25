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

export async function test_api_cache_configuration_redis_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for authentication
  const authConnection: api.IConnection = { host: connection.host };
  // Authenticate super administrator using utility function
  const superAdminAuth = await authorize_super_administrator_join(
    authConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Create separate connection for cache configuration operations
  const configConnection: api.IConnection = { host: connection.host };
  configConnection.headers = { Authorization: superAdminAuth.token.access };
  // Create Redis session cache configuration
  const cacheConfig =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      configConnection,
      {
        body: {
          cache_key: "redis.session",
          cache_type: "redis",
          configuration_value: JSON.stringify({
            host: "localhost",
            port: 6379,
            db: 0,
            ttl: 3600,
            prefix: "session:",
          }),
          description: "Redis cache configuration for session management",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(cacheConfig);
  // Validate business logic only after typia.assert() complete validation
  TestValidator.equals(
    "cache_key matches input",
    cacheConfig.cache_key,
    "redis.session",
  );
  TestValidator.equals(
    "cache_type matches input",
    cacheConfig.cache_type,
    "redis",
  );
  TestValidator.predicate("is_active is true", cacheConfig.is_active);
  TestValidator.predicate(
    "priority is within valid range",
    cacheConfig.priority >= 1 && cacheConfig.priority <= 10,
  );
}
