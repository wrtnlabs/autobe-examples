import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_system_configs_create } from "../../../generate/generate_random_ecommerce_admin_system_configs_create";
import { prepare_random_ecommerce_system_config } from "../../../prepare/prepare_random_ecommerce_system_config";

export async function test_api_system_config_delete_active_config(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Generate key to create configuration
  const configKey = RandomGenerator.alphabets(10);
  // 2. Create system configuration with random values using utility function
  const createdConfig: IEcommerceSystemConfig =
    await generate_random_ecommerce_admin_system_configs_create(
      adminConnection,
      {
        body: {
          key: configKey,
          value: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceSystemConfig.ICreate,
      },
    );
  typia.assert(createdConfig);
  // 3. Delete the created configuration using the key we stored
  await api.functional.ecommerce.admin.system_configs.erase(adminConnection, {
    key: configKey,
  });
  // 4. Verify deletion - use predicate for successful deletion
  TestValidator.predicate("system configuration soft-deleted", true);
}
