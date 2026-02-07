import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_update(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Prepare configuration update with minimal valid data
  const updateBody = {
    config_value: JSON.stringify({
      shipping_fee: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0>
      >() satisfies number as number,
    }),
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  // Perform configuration update
  const updatedConfig =
    await api.functional.shoppingMall.admin.configs.putByConfigid(
      adminConnection,
      {
        configId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
}
