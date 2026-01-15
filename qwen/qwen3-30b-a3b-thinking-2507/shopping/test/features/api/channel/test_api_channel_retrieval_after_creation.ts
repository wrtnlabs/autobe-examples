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
export async function test_api_channel_retrieval_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminConnection);
  // Step 2: Create channel
  const channel = await generate_random_shopping_mall_admin_channels_create(
    adminConnection,
    {
      body: {
        channelCode: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(channel);
  // Step 3: Public channel retrieval
  const retrievedChannel = await api.functional.shoppingMall.channels.at(
    connection,
    {
      channelCode: channel.channelCode,
    },
  );
  typia.assert(retrievedChannel);
  // Step 4: Validation
  TestValidator.equals(
    "channelCode matches",
    retrievedChannel.channelCode,
    channel.channelCode,
  );
  TestValidator.equals("name matches", retrievedChannel.name, channel.name);
  TestValidator.equals(
    "status matches",
    retrievedChannel.status,
    channel.status,
  );
}
