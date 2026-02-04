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

class InvalidChannelNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidChannelNameError";
  }
}
export async function test_api_channel_creation_max_length(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "SecurePassword123!",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Generate a channel name with exactly 100 characters
  const channelName = ArrayUtil.repeat(100, () => {
    // Alternate between letters and spaces for realistic name
    return Math.random() < 0.2 ? " " : RandomGenerator.alphabets(1);
  }).join();
  // Verify the name meets criteria (100 chars, alphabetic and spaces only)
  if (channelName.length !== 100 || !/^[a-zA-Z ]+$/.test(channelName)) {
    throw new InvalidChannelNameError(
      "Channel name has invalid length or characters",
    );
  }
  // Create channel with the valid name
  const channel = (await api.functional.shoppingMall.admin.channels.create(
    adminConnection,
    {
      body: {
        name: channelName,
      } satisfies IShoppingMallChannel.ICreate,
    },
  )) satisfies IShoppingMallChannel;
  typia.assert(channel);
  TestValidator.equals(
    "channel should have a valid channel_id",
    channel.channel_id !== "",
    true,
  );
}
