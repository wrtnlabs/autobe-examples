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

export async function test_api_cache_configuration_update_duplicate_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
    },
  });
  typia.assert(admin);
  // 2. Create first cache configuration
  const firstConfig =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: "session_cache_primary",
          cache_type: "redis",
          configuration_value: '{"ttl": 3600, "max_memory": "256mb"}',
          is_active: true,
          priority: 5,
        },
      },
    );
  typia.assert(firstConfig);
  // 3. Create second cache configuration
  const secondConfig =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: "session_cache_backup",
          cache_type: "memory",
          configuration_value: '{"ttl": 1800, "max_size": 10000}',
          is_active: true,
          priority: 3,
        },
      },
    );
  typia.assert(secondConfig);
  // 4. Attempt to update second config with first config's cache_key
  await TestValidator.error(
    "should reject duplicate cache_key update",
    async () => {
      await api.functional.ecommerce.administrator.cache_configurations.update(
        adminConnection,
        {
          configId: secondConfig.id,
          body: {
            cache_key: firstConfig.cache_key,
          } satisfies IEcommerceCacheConfiguration.IUpdate,
        },
      );
    },
  );
}
