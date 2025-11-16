import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_shopping_mall_channel_retrieval_public(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin by joining
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "validPassword1!",
        phone_number: null,
        role: "superadmin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a shopping mall channel
  const channelCode: string = RandomGenerator.alphabets(6).toUpperCase();
  const channelName: string = RandomGenerator.name(2);
  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      {
        body: {
          code: channelCode,
          name: channelName,
        } satisfies IShoppingMallChannel.ICreate,
      },
    );
  typia.assert(createdChannel);

  // 3. Retrieve shopping mall channel by channelCode
  const retrievedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.shoppingMallChannels.at(connection, {
      channelCode: createdChannel.code,
    });
  typia.assert(retrievedChannel);

  // 4. Verify that retrieved channel matches created channel
  TestValidator.equals(
    "channel id match",
    retrievedChannel.id,
    createdChannel.id,
  );
  TestValidator.equals(
    "channel code match",
    retrievedChannel.code,
    createdChannel.code,
  );
  TestValidator.equals(
    "channel name match",
    retrievedChannel.name,
    createdChannel.name,
  );
}
