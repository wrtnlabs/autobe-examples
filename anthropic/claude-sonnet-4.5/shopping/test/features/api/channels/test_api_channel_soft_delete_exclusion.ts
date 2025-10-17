import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test that soft-deleted sales channels are properly excluded from retrieval
 * operations.
 *
 * This test validates the soft delete mechanism by creating a channel, deleting
 * it, and then verifying that the deleted channel cannot be retrieved through
 * normal operations. This ensures data integrity and proper filtering of
 * deleted records.
 *
 * Steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create a new sales channel
 * 3. Soft delete the channel (sets deleted_at timestamp)
 * 4. Attempt to retrieve the deleted channel
 * 5. Verify retrieval fails with appropriate error
 */
export async function test_api_channel_soft_delete_exclusion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a new sales channel
  const channelData = {
    channel_code: RandomGenerator.alphaNumeric(10),
    channel_name: RandomGenerator.name(2),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelData,
    });
  typia.assert(channel);

  // Step 3: Soft delete the channel
  await api.functional.shoppingMall.admin.channels.erase(connection, {
    channelId: channel.id,
  });

  // Step 4: Attempt to retrieve the soft-deleted channel and verify it fails
  await TestValidator.error(
    "soft-deleted channel should not be retrievable",
    async () => {
      await api.functional.shoppingMall.admin.channels.at(connection, {
        channelId: channel.id,
      });
    },
  );
}
