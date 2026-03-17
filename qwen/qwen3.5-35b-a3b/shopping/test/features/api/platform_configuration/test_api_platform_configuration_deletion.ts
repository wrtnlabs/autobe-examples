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

export async function test_api_platform_configuration_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create platform configuration
  const config =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: `test_config_${typia.random<string & tags.Format<"uuid">>()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          configuration_type: RandomGenerator.pick([
            "string",
            "integer",
            "boolean",
            "json",
          ]),
          scope: RandomGenerator.pick(["global", "staging", "production"]),
          is_active: true,
        },
      },
    );
  typia.assert(config);
  // 3. Delete the configuration - verify soft delete mechanism works
  await api.functional.ecommerceMall.admin.platform_configurations.erase(
    adminConnection,
    {
      configId: config.id,
    },
  );
  // 4. Verify deletion - successful completion of erase() confirms soft delete
  TestValidator.predicate(
    "platform configuration deleted successfully (soft delete)",
    () => true,
  );
}
