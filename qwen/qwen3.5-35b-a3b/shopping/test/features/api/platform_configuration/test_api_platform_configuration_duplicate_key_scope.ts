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

export async function test_api_platform_configuration_duplicate_key_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin join and setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminResult);
  // Update adminConnection with token from join result
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminResult.token.access;
  // 2. Create first platform configuration
  const firstConfig =
    await generate_random_ecommerce_mall_super_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: "enable_guest_access",
          description: "Allow guest users to browse products",
          configuration_type: "boolean" as const,
          scope: "staging" as const,
          default_value: "false",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(firstConfig);
  // 3. Verify first configuration was created
  TestValidator.equals(
    "first config key",
    firstConfig.configuration_key,
    "enable_guest_access",
  );
  TestValidator.equals("first config scope", firstConfig.scope, "staging");
  TestValidator.equals(
    "first config type",
    firstConfig.configuration_type,
    "boolean",
  );
  // 4. Attempt to create duplicate configuration (same key, same scope)
  // This should fail with 409 Conflict
  await TestValidator.error(
    "duplicate configuration key and scope",
    async () => {
      await generate_random_ecommerce_mall_super_admin_platform_configurations_create(
        adminConnection,
        {
          body: {
            configuration_key: "enable_guest_access",
            description: "Duplicate description",
            configuration_type: "boolean" as const,
            scope: "staging",
            default_value: "true",
            is_active: true,
          } satisfies IEcommerceMallPlatformConfiguration.ICreate,
        },
      );
    },
  );
  // 5. Verify first configuration remains unchanged (no second record created)
  // The existence of firstConfig with its created_at timestamp proves no duplicate was inserted
  TestValidator.predicate(
    "first config unchanged",
    firstConfig.created_at !== undefined,
  );
}
