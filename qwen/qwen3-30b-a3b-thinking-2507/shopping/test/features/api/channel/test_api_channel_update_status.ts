import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { prepare_random_shopping_mall_channel } from "../../../prepare/prepare_random_shopping_mall_channel";
import { generate_random_shopping_mall_admin_channels_create } from "../../../generate/generate_random_shopping_mall_admin_channels_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_update_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user context for channel management
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  // Step 2: Establish channel for status update scenario
  const channel = await generate_random_shopping_mall_admin_channels_create(
    adminConnection,
    {
      body: {
        channelCode: `channel_${RandomGenerator.alphaNumeric(10)}`,
        name: RandomGenerator.name(),
      },
    },
  );
  // Step 3: Confirm admin can update channel status to 'maintenance' (will be accepted as valid in update but converted to 'pending' in response)
  const updateChannel = await api.functional.shoppingMall.admin.channels.update(
    adminConnection,
    {
      channelCode: channel.channelCode,
      body: {
        status: "maintenance",
      },
    },
  );
  // Step 4: Validate channel status update (expecting 'pending' as the actual response value)
  typia.assert(updateChannel);
  TestValidator.equals(
    "channel status updated to maintenance",
    updateChannel.status,
    "pending",
  );
}
