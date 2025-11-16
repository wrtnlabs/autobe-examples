import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_shopping_mall_channel_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authentication: Join as admin user with required properties
  // 2. Create a new shopping mall channel with distinct code and name
  // 3. Delete the created shopping mall channel by its unique code
  // 4. No response from deletion, so ensure no errors occur during deletion call
  // 5. Use typia.assert to validate responses from join and create
  // 6. Use TestValidator.predicate to assert deletion proceeded without error

  // 1. Admin user create and authenticate
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminCreateDto: IShoppingMallAdmin.ICreate = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "adminpassword123",
    phone_number: null,
    role: "admin",
  };

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateDto });
  typia.assert(adminAuthorized);

  // 2. Create shopping mall channel
  const channelCode: string = `code_${RandomGenerator.alphabets(5)}`;
  const channelCreateDto: IShoppingMallChannel.ICreate = {
    code: channelCode,
    name: RandomGenerator.name(),
  };

  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      { body: channelCreateDto },
    );
  typia.assert(createdChannel);

  TestValidator.equals(
    "channel code matches on creation",
    createdChannel.code,
    channelCreateDto.code,
  );
  TestValidator.equals(
    "channel name matches on creation",
    createdChannel.name,
    channelCreateDto.name,
  );

  // 3. Delete the created channel by code
  await api.functional.shoppingMall.admin.shoppingMallChannels.erase(
    connection,
    {
      channelCode: channelCode,
    },
  );

  // 4. Confirm deletion call succeeded by predicate with true
  TestValidator.predicate("channel deletion performed without error", true);
}
