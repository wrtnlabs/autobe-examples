import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

export async function test_api_shopping_mall_channel_category_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authorization
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "Admin123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a shopping mall channel
  const channelCreateBody = {
    code: `chan_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      {
        body: channelCreateBody,
      },
    );
  typia.assert(channel);

  // 3. Create a shopping mall channel category under the created channel
  const channelCategoryCreateBody = {
    shopping_mall_product_category_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    is_active: true,
    display_order: 1,
    notes: null,
  } satisfies IShoppingMallChannelCategory.ICreate;

  const channelCategory: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallChannelCategories.create(
      connection,
      {
        channelCode: channel.code,
        body: channelCategoryCreateBody,
      },
    );
  typia.assert(channelCategory);

  // 4. Delete the created channel category
  await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallChannelCategories.erase(
    connection,
    {
      channelCode: channel.code,
      id: channelCategory.id,
    },
  );
}
