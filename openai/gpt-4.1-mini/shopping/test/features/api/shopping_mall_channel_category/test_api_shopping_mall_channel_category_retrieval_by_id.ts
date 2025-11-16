import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

export async function test_api_shopping_mall_channel_category_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "strong_password_123",
        phone_number: null,
        role: "superadmin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create shopping mall channel
  const channelCode = `channel_${RandomGenerator.alphaNumeric(5)}`;
  const channelName = RandomGenerator.name();
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      {
        body: {
          code: channelCode,
          name: channelName,
        } satisfies IShoppingMallChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create shopping mall channel category
  const productCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryCreateBody = {
    shopping_mall_product_category_id: productCategoryId,
    is_active: true,
    display_order: 1,
    notes: "Test category for e2e retrieval",
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallChannelCategories.create(
      connection,
      {
        channelCode: channel.code,
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Retrieve the created shopping mall channel category by ID
  const retrievalWithoutAuthConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  const readCategory: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.shoppingMallChannels.shoppingMallChannelCategories.at(
      retrievalWithoutAuthConn,
      {
        channelCode: channel.code,
        id: category.id,
      },
    );
  typia.assert(readCategory);

  // 5. Validate returned category matches created category in key properties
  TestValidator.equals("category id matches", readCategory.id, category.id);
  TestValidator.equals(
    "category channel code matches",
    readCategory.shopping_mall_channel_code,
    channel.code,
  );
  TestValidator.equals(
    "category product category code matches",
    readCategory.shopping_mall_product_category_code,
    category.shopping_mall_product_category_code,
  );
  TestValidator.equals("category is active", readCategory.is_enabled, true);
  TestValidator.equals(
    "category display order matches",
    readCategory.order_index,
    1,
  );
  TestValidator.equals(
    "category memo matches",
    readCategory.memo ?? null,
    null,
  );

  // Additional direct equality on full category object is not possible due to system generated fields
  // but the critical matching fields have been validated above accordingly
}
