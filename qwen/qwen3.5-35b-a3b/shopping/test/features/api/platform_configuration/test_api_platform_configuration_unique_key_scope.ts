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

export async function test_api_platform_configuration_unique_key_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Update adminConnection with token from auth response
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Create first platform configuration
  const firstConfig =
    await api.functional.ecommerceMall.admin.platform_configurations.create(
      adminConnection,
      {
        body: {
          configuration_key: "feature_flag_enabled",
          description: "Enable feature flag system",
          configuration_type: "boolean",
          scope: "staging",
          default_value: "true",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(firstConfig);
  // Validate first configuration was created successfully
  TestValidator.equals(
    "configuration key matches",
    firstConfig.configuration_key,
    "feature_flag_enabled",
  );
  TestValidator.equals("scope matches", firstConfig.scope, "staging");
  TestValidator.equals(
    "configuration type matches",
    firstConfig.configuration_type,
    "boolean",
  );
  TestValidator.equals("is active flag", firstConfig.is_active, true);
  // 3. Attempt to create second configuration with same key and scope (should fail with 409)
  await TestValidator.httpError(
    "duplicate key-scope combination should return 409",
    [409],
    async () => {
      await api.functional.ecommerceMall.admin.platform_configurations.create(
        adminConnection,
        {
          body: {
            configuration_key: "feature_flag_enabled",
            description: "Duplicate configuration attempt",
            configuration_type: "boolean",
            scope: "staging",
            default_value: "false",
            is_active: true,
          } satisfies IEcommerceMallPlatformConfiguration.ICreate,
        },
      );
    },
  );
  // 4. Verify first configuration is still active in system
  TestValidator.equals(
    "first configuration key still matches",
    firstConfig.configuration_key,
    "feature_flag_enabled",
  );
  TestValidator.equals(
    "first configuration scope still matches",
    firstConfig.scope,
    "staging",
  );
  TestValidator.equals(
    "first configuration is still active",
    firstConfig.is_active,
    true,
  );
}
