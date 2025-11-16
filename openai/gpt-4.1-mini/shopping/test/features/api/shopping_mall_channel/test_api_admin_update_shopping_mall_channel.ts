import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_admin_update_shopping_mall_channel(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "StrongPassword123!",
        phone_number: null,
        role: "superadmin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new shopping mall channel
  const initialChannelCode = RandomGenerator.alphaNumeric(8);
  const initialChannelName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const channelCreateBody = {
    code: initialChannelCode,
    name: initialChannelName,
  } satisfies IShoppingMallChannel.ICreate;

  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      { body: channelCreateBody },
    );
  typia.assert(createdChannel);

  TestValidator.equals(
    "created channel code matches",
    createdChannel.code,
    initialChannelCode,
  );
  TestValidator.equals(
    "created channel name matches",
    createdChannel.name,
    initialChannelName,
  );

  // 3. Update the channel name
  const updatedChannelName = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const channelUpdateBody = {
    name: updatedChannelName,
  } satisfies IShoppingMallChannel.IUpdate;

  const updatedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.update(
      connection,
      {
        channelCode: createdChannel.code,
        body: channelUpdateBody,
      },
    );
  typia.assert(updatedChannel);

  TestValidator.equals(
    "updated channel code remains same",
    updatedChannel.code,
    createdChannel.code,
  );
  TestValidator.equals(
    "updated channel name matches",
    updatedChannel.name,
    updatedChannelName,
  );
  TestValidator.predicate(
    "updated channel updated_at is set",
    updatedChannel.updated_at !== null &&
      updatedChannel.updated_at !== undefined,
  );
}
