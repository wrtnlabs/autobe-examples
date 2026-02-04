import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { prepare_random_shopping_mall_channel } from "../../../prepare/prepare_random_shopping_mall_channel";

export async function test_api_channel_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin and create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create a channel with a valid name (3-100 characters, alphabetical + space)
  const channelName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const createdChannel =
    await api.functional.shoppingMall.admin.channels.create(adminConnection, {
      body: {
        name: channelName,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(createdChannel);
  // 3. Retrieve the channel by its ID
  const retrievedChannel = await api.functional.shoppingMall.admin.channels.at(
    adminConnection,
    {
      channelId: createdChannel.channel_id,
    },
  );
  typia.assert(retrievedChannel);
  // 4. Verify channel ID matches
  TestValidator.equals(
    "channel_id matches",
    retrievedChannel.channel_id,
    createdChannel.channel_id,
  );
}
