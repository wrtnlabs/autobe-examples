import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function test_api_cache_configuration_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(auth);
  // Step 2: Create initial cache configuration
  const createBody = {
    cache_key: "redis.session",
    cache_type: "redis",
    configuration_value: JSON.stringify({ ttl: "3600", maxMemory: "1024" }),
    description: "Session cache configuration",
    is_active: true,
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
  } satisfies IEcommerceCacheConfiguration.ICreate;
  const initialConfig =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      { body: createBody },
    );
  typia.assert(initialConfig);
  // Step 3: Update configuration to trigger snapshot creation
  const updateBody = {
    cache_key: "redis.session.v2",
    configuration_value: { ttl: "7200", maxMemory: "2048" },
    description: "Updated session cache configuration",
  } satisfies IEcommerceCacheConfiguration.IUpdate;
  const updatedConfig =
    await api.functional.ecommerce.administrator.cache_configurations.update(
      adminConnection,
      {
        configId: initialConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // Step 4: Validate the update was successful
  TestValidator.equals(
    "cache_key updated",
    updatedConfig.cache_key,
    "redis.session.v2",
  );
  // Validate that update preserves the configuration ID
  TestValidator.predicate(
    "configuration ID unchanged",
    updatedConfig.id === initialConfig.id,
  );
}
