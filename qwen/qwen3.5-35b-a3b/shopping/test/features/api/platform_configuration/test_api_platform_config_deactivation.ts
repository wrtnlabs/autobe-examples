import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_platform_configurations_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_platform_configurations_create";
import { prepare_random_ecommerce_mall_platform_configuration } from "../../../prepare/prepare_random_ecommerce_mall_platform_configuration";

/**
 * Test platform configuration deactivation workflow.
 * 1. Super admin joins
 * 2. Create platform configuration with is_active=true
 * 3. Update configuration to set is_active=false
 * 4. Validate deactivation was successful
 */
export async function test_api_platform_config_deactivation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create platform configuration with is_active=true
  // Set up admin connection with authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  const config =
    await generate_random_ecommerce_mall_super_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<128>
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          configuration_type: "boolean" as const,
          scope: "global" as const,
          default_value: "true",
          is_active: true,
        },
      },
    );
  typia.assert(config);
  TestValidator.equals(
    "Config should be active on creation",
    config.is_active,
    true,
  );
  // 3. Update configuration to deactivate
  const deactivateBody = {
    is_active: false,
  } satisfies IEcommerceMallPlatformConfiguration.IUpdate;
  const deactivatedConfig =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.update(
      adminConnection,
      {
        configId: config.id,
        body: deactivateBody,
      },
    );
  typia.assert(deactivatedConfig);
  // 4. Validate deactivation results
  TestValidator.equals(
    "is_active should be false",
    deactivatedConfig.is_active,
    false,
  );
  TestValidator.equals(
    "configuration_key should remain unchanged",
    deactivatedConfig.configuration_key,
    config.configuration_key,
  );
  TestValidator.equals(
    "description should remain unchanged",
    deactivatedConfig.description,
    config.description,
  );
  TestValidator.equals(
    "configuration_type should remain unchanged",
    deactivatedConfig.configuration_type,
    config.configuration_type,
  );
  TestValidator.equals(
    "scope should remain unchanged",
    deactivatedConfig.scope,
    config.scope,
  );
  TestValidator.equals(
    "default_value should remain unchanged",
    deactivatedConfig.default_value,
    config.default_value,
  );
  TestValidator.equals(
    "deleted_at should be null (not soft deleted)",
    deactivatedConfig.deleted_at,
    null,
  );
  TestValidator.predicate(
    "updated_at should be after creation time",
    new Date(deactivatedConfig.updated_at) > new Date(config.created_at),
  );
}