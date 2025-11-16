import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Test the update process of an existing shopping mall channel category by an
 * admin user. The scenario starts with authenticating as an admin user using
 * the join endpoint, then creating a shopping mall channel, followed by
 * creating a shopping mall channel category under that channel. After these
 * prerequisites, the scenario updates the channel category using the PUT
 * endpoint. The test verifies that the update properly changes the category
 * details, maintains data integrity, and enforces admin authorization.
 */
export async function test_api_shopping_mall_channel_category_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins (registers and authenticates)
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Password123!",
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Create a shopping mall channel
  // Prepare channel create body
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channelCreateBody = {
    code: channelCode,
    name: RandomGenerator.name(),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      { body: channelCreateBody },
    );
  typia.assert(channel);

  TestValidator.equals(
    "channel code matches",
    channel.code,
    channelCreateBody.code,
  );

  // 3. Create a shopping mall channel category under the created channel
  // For creation, since IShoppingMallChannelCategory.ICreate requires shopping_mall_product_category_id,
  // we generate a UUID for it (use typia.random with string + UUID format)
  const productCategoryId = typia.random<string & tags.Format<"uuid">>();

  const channelCategoryCreateBody = {
    shopping_mall_product_category_id: productCategoryId,
    is_active: true,
    display_order: 1,
    notes: null,
  } satisfies IShoppingMallChannelCategory.ICreate;

  const createdCategory: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallChannelCategories.create(
      connection,
      {
        channelCode: channel.code,
        body: channelCategoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "initial category is_enabled",
    createdCategory.is_enabled,
    true,
  );

  // 4. Prepare update for shopping mall channel category
  // As per IShoppingMallChannelCategory.IUpdate schema, we need
  // shopping_mall_channel_id (UUID), shopping_mall_product_category_id (UUID), is_active (boolean), display_order (int32 >=0), notes (nullable string)

  // Use exact channel id from created channel
  const updateIsActive = false;
  const updateDisplayOrder = createdCategory.order_index + 1;
  const updateNotes = "Updated via e2e test";

  const updateBody = {
    shopping_mall_channel_id: channel.id,
    shopping_mall_product_category_id: productCategoryId,
    is_active: updateIsActive,
    display_order: updateDisplayOrder,
    notes: updateNotes,
  } satisfies IShoppingMallChannelCategory.IUpdate;

  // 5. Update the channel category
  const updatedCategory: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallChannelCategories.update(
      connection,
      {
        channelCode: channel.code,
        id: createdCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // 6. Validate update results
  TestValidator.equals(
    "category id remains same",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "channel code remains same",
    updatedCategory.shopping_mall_channel_code,
    channel.code,
  );
  TestValidator.equals(
    "updated is_enabled (is_active)",
    updatedCategory.is_enabled,
    updateIsActive,
  );
  TestValidator.equals(
    "updated order_index (display_order)",
    updatedCategory.order_index,
    updateDisplayOrder,
  );

  TestValidator.equals(
    "updated memo (notes)",
    updatedCategory.memo === null ? null : updatedCategory.memo,
    updateNotes,
  );
}
