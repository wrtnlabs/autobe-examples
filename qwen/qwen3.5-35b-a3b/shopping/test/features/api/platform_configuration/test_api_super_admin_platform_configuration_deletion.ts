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
 * Test the successful deletion of a platform configuration by a super administrator.
 *
 * Workflow:
 * 1. Register super administrator account
 * 2. Create a platform configuration
 * 3. Delete the configuration
 * 4. Verify deletion was successful
 */
export async function test_api_super_admin_platform_configuration_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminResult);
  // Step 2: Create platform configuration
  const platformConfiguration =
    await generate_random_ecommerce_mall_super_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: `${RandomGenerator.alphaNumeric(8).toLowerCase()}_${RandomGenerator.alphaNumeric(4).toLowerCase()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          configuration_type: typia.random<
            "string" | "integer" | "boolean" | "json"
          >(),
          scope: typia.random<"global" | "staging" | "production">(),
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(platformConfiguration);
  // Step 3: Delete the platform configuration
  await api.functional.ecommerceMall.superAdmin.platform_configurations.erase(
    adminConnection,
    {
      configId: platformConfiguration.id,
    },
  );
  // Step 4: Verify deletion completed successfully
  // The erase function returns void, so successful completion indicates deletion
  TestValidator.equals(
    "platform configuration should be deleted successfully",
    undefined,
    undefined,
  );
}
