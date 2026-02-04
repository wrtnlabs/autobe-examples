import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { prepare_random_shopping_mall_channel } from "../../../prepare/prepare_random_shopping_mall_channel";
import { generate_random_shopping_mall_super_admin_channels_create } from "../../../generate/generate_random_shopping_mall_super_admin_channels_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_channel_creation_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // superAdminConnection.headers is now updated internally by authorize function
  // Step 2: Create a new channel with empty body as required by IShoppingMallChannel.ICreate
  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.superAdmin.channels.create(
      superAdminConnection, // Use superAdmin-specific connection
      {
        body: {
          // IShoppingMallChannel.ICreate is empty, so no properties required
        } satisfies IShoppingMallChannel.ICreate,
      },
    );
  typia.assert(createdChannel);
  // Step 3: Validate the created channel
  TestValidator.equals(
    "channel has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdChannel.id,
    ),
    true,
  );
}
