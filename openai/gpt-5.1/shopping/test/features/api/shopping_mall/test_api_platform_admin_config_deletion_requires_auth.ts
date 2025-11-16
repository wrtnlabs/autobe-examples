import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_config_deletion_requires_auth(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a config entry as the authenticated platform admin
  const createBody = {
    namespace: "checkout",
    key: `max_cart_items_${RandomGenerator.alphaNumeric(8)}`,
    value: "50",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to delete the config without authentication and expect failure
  await TestValidator.error(
    "unauthenticated config erase must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.configs.erase(
        unauthenticated,
        {
          configId: createdConfig.id,
        },
      );
    },
  );

  // 5. Delete the config with valid platform admin authentication (should succeed)
  await api.functional.shoppingMall.platformAdmin.configs.erase(connection, {
    configId: createdConfig.id,
  });
}
