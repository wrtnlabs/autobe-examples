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
export async function test_api_channel_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      name: RandomGenerator.name(),
    },
  });
  // Create channel with valid snake_case code and descriptive name
  const channelCode = "online_store";
  const channelName = "Customer Online Store";
  const channel = await generate_random_shopping_mall_admin_channels_create(
    adminConnection,
    {
      body: {
        channelCode: channelCode,
        name: channelName,
      },
    },
  );
  // Validate the channel
  typia.assert(channel);
  TestValidator.equals(
    "valid channel code",
    channel.channelCode,
    "online_store",
  );
  TestValidator.equals(
    "descriptive channel name",
    channel.name,
    "Customer Online Store",
  );
}
