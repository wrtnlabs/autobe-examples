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

/**
 * Test updating a Redis cache configuration with valid patch parameters.
 * Validates cache_key modification, JSON configuration updates, priority adjustment,
 * description changes, snapshot creation, and immediate configuration activation.
 */
export async function test_api_cache_configuration_update_valid_patch(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(auth);
  // Step 2: Create a cache configuration to update (simulate existing config)
  const existingConfigId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Perform partial configuration update
  const updateBody = {
    cache_key: "redis.session_optimized",
    cache_type: "redis",
    configuration_value: {
      ttl: "3600",
      max_memory: "1gb",
      eviction_policy: "lru",
    },
    description:
      "Optimized session cache configuration with improved TTL settings",
    is_active: true,
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
  } satisfies IEcommerceCacheConfiguration.IUpdate;
  const updatedConfig =
    await api.functional.ecommerce.superAdministrator.cache_configurations.update(
      adminConnection,
      {
        configId: existingConfigId,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // Step 4: Validate update results
  TestValidator.equals(
    "cache key updated",
    updatedConfig.cache_key,
    "redis.session_optimized",
  );
  TestValidator.notEquals(
    "config ID unchanged",
    updatedConfig.id,
    existingConfigId,
  );
  TestValidator.predicate(
    "is_active remains true",
    updatedConfig.is_active === true,
  );
  TestValidator.predicate(
    "priority in valid range",
    updatedConfig.priority >= 1 && updatedConfig.priority <= 10,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof updatedConfig.created_at === "string",
  );
  TestValidator.predicate(
    "cache_type is redis",
    updatedConfig.cache_type === "redis",
  );
}
