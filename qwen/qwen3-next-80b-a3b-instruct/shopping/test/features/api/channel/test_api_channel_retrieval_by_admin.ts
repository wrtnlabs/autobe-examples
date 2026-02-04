import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using authorize_admin_join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: adminCredentials,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a random channel using the service's random generator
  const channel: IShoppingMallChannel =
    api.functional.shoppingMall.admin.channels.at.random();
  typia.assert(channel);
  // Step 3: Retrieve the channel using the admin connection with the generated channel ID
  const retrievedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.at(adminConnection, {
      channelId: channel.id,
    });
  typia.assert(retrievedChannel);
  // Step 4: Validate that the retrieved channel matches the original channel
  TestValidator.equals(
    "retrieved channel ID matches created channel",
    retrievedChannel.id,
    channel.id,
  );
  // Step 5: Test 404 scenario - retrieve a non-existent channel
  const nonExistentChannelId = typia.random<string & tags.Format<"uuid">>();
  // Verify that trying to access a non-existent channel returns 404
  await TestValidator.error(
    "non-existent channel should return 404",
    async () => {
      await api.functional.shoppingMall.admin.channels.at(adminConnection, {
        channelId: nonExistentChannelId,
      });
    },
  );
}
