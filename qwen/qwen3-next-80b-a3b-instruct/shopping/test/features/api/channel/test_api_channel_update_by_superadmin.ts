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
export async function test_api_channel_update_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Create a channel to be updated
  const createdChannel =
    await generate_random_shopping_mall_super_admin_channels_create(
      superAdminConnection,
      {},
    );
  typia.assert(createdChannel);
  // Step 3: Update the channel with an empty body (as required by IShoppingMallChannel.IUpdate = {})
  const updatedChannel =
    await api.functional.shoppingMall.superAdmin.channels.update(
      superAdminConnection,
      {
        channelId: createdChannel.id,
        body: {}, // Must be empty object as IShoppingMallChannel.IUpdate is defined as {} in the schema
      } satisfies api.functional.shoppingMall.superAdmin.channels.update.Props,
    );
  typia.assert(updatedChannel);
  // Step 4: Validate that the channel was updated successfully with no property changes (as IUpdate is empty)
  // Since IShoppingMallChannel.IUpdate is empty, no fields can be modified
  // The update should return the same channel with unchanged properties
  TestValidator.equals(
    "channel ID unchanged",
    updatedChannel.id,
    createdChannel.id,
  );
  // Step 5: Since no GET endpoint exists for channels, validate against the returned update response
  // Compare all properties since they should be identical (no fields are modifiable with empty IUpdate)
  TestValidator.equals(
    "channel data unchanged",
    updatedChannel,
    createdChannel,
  );
}
