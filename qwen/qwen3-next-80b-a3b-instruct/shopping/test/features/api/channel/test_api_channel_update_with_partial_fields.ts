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
export async function test_api_channel_update_with_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // Step 2: Create a channel with initial values
  const initialChannel: IShoppingMallChannel =
    await generate_random_shopping_mall_super_admin_channels_create(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(initialChannel);
  // Step 3: Perform empty partial update (no fields to update since IUpdate is empty)
  const updatedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.superAdmin.channels.update(
      superAdminConnection,
      {
        channelId: initialChannel.id,
        body: {} satisfies IShoppingMallChannel.IUpdate,
      },
    );
  typia.assert(updatedChannel);
  // Step 4: Validate that the channel ID remains unchanged
  TestValidator.equals(
    "channel id unchanged after empty update",
    updatedChannel.id,
    initialChannel.id,
  );
}
