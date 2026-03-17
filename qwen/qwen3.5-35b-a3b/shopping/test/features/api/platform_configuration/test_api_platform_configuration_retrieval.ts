import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_platform_configurations_create } from "../../../generate/generate_random_ecommerce_mall_admin_platform_configurations_create";
import { prepare_random_ecommerce_mall_platform_configuration } from "../../../prepare/prepare_random_ecommerce_mall_platform_configuration";

export async function test_api_platform_configuration_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create platform configuration using utility function
  const createdConfig =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          configuration_type: RandomGenerator.pick([
            "string",
            "integer",
            "boolean",
            "json",
          ]),
          scope: RandomGenerator.pick(["global", "staging", "production"]),
          default_value: RandomGenerator.pick([
            typia.random<string>(),
            null,
            undefined,
          ]),
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);
  // 3. Retrieve platform configuration by ID
  const retrievedConfig =
    await api.functional.ecommerceMall.admin.platform_configurations.at(
      adminConnection,
      { configId: createdConfig.id },
    );
  typia.assert(retrievedConfig);
  // 4. Validate response matches expected structure
  TestValidator.equals(
    "configuration key matches",
    retrievedConfig.configuration_key,
    createdConfig.configuration_key,
  );
  TestValidator.equals(
    "description matches",
    retrievedConfig.description,
    createdConfig.description,
  );
  TestValidator.equals(
    "configuration type matches",
    retrievedConfig.configuration_type,
    createdConfig.configuration_type,
  );
  TestValidator.equals(
    "scope matches",
    retrievedConfig.scope,
    createdConfig.scope,
  );
  TestValidator.equals(
    "default value matches",
    retrievedConfig.default_value,
    createdConfig.default_value,
  );
  TestValidator.equals(
    "is active matches",
    retrievedConfig.is_active,
    createdConfig.is_active,
  );
  TestValidator.equals(
    "config ID exists",
    retrievedConfig.id,
    createdConfig.id,
  );
  TestValidator.predicate("created_at is valid timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(retrievedConfig.created_at),
  );
  TestValidator.predicate("updated_at is valid timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(retrievedConfig.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null for active config",
    retrievedConfig.deleted_at,
    null,
  );
}
