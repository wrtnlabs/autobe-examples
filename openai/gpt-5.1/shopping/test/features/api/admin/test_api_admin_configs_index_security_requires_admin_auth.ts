import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_admin_configs_index_security_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by stripping headers once
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Ensure that PATCH /shoppingMall/admin/configs fails without admin auth
  await TestValidator.error(
    "configs index must reject anonymous client",
    async () => {
      await api.functional.shoppingMall.admin.configs.index(
        anonymousConnection,
        {
          body: {} satisfies IShoppingMallConfig.IRequest,
        },
      );
    },
  );

  // 3. Join as an admin to obtain authenticated context (SDK sets Authorization header)
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Create at least one configuration entry as the authenticated admin
  const createdConfig = await api.functional.shoppingMall.admin.configs.create(
    connection,
    {
      body: {
        namespace: "checkout",
        config_key: `maxItems-${RandomGenerator.alphaNumeric(8)}`,
        environment: "test",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        value_json: JSON.stringify({ max_cart_items: 10 }),
        is_active: true,
      } satisfies IShoppingMallConfig.ICreate,
    },
  );
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 5. Call PATCH /shoppingMall/admin/configs as the authenticated admin
  const pageResult = await api.functional.shoppingMall.admin.configs.index(
    connection,
    {
      body: {
        page: 0 satisfies number as number,
        limit: 10 satisfies number as number,
        namespace: createdConfig.namespace,
      } satisfies IShoppingMallConfig.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallConfig.ISummary>(pageResult);

  // 6. Assert that the created configuration is present in the paginated data
  const found = pageResult.data.find((row) => row.id === createdConfig.id);
  TestValidator.predicate(
    "configs index for admin must include just-created config",
    found !== undefined,
  );
}
