import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

export async function test_api_shoppingmall_channel_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new shopping mall channel as admin
  const channelCode = RandomGenerator.alphaNumeric(10);
  const channelName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 6,
  });
  const createBody = {
    parent_channel_id: null,
    channel_code: channelCode,
    channel_name: channelName,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 15,
    }),
  } satisfies IShoppingMallChannelDefinition.ICreate;

  const createdChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: createBody,
    });
  typia.assert(createdChannel);

  // 3. Retrieve the channel details by channelCode
  const retrievedChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.channels.at(connection, {
      channelCode: channelCode,
    });
  typia.assert(retrievedChannel);

  // 4. Validate the retrieved channel matches the created channel
  TestValidator.equals(
    "channel_code matches",
    retrievedChannel.channel_code,
    createdChannel.channel_code,
  );
  TestValidator.equals(
    "channel_name matches",
    retrievedChannel.channel_name,
    createdChannel.channel_name,
  );
  TestValidator.equals(
    "parent_channel_id is null for top-level",
    retrievedChannel.parent_channel_id,
    null,
  );
}
