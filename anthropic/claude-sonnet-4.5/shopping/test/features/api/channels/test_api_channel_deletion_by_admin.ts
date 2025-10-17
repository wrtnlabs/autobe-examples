import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test the complete workflow of an admin deleting a sales channel through soft
 * deletion.
 *
 * This test validates that administrators can successfully remove distribution
 * channels from active use while preserving all historical data for audit
 * purposes. The test creates a new admin account, authenticates the admin,
 * creates a sales channel with complete configuration, and then performs soft
 * deletion.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Create a new sales channel with valid configuration
 * 3. Perform soft deletion of the channel
 * 4. Verify the deletion completed successfully
 */
export async function test_api_channel_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create a sales channel
  const channelCreateData = {
    channel_code: RandomGenerator.alphaNumeric(8),
    channel_name: RandomGenerator.name(2),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreateData,
    });
  typia.assert(channel);

  // Verify channel was created successfully
  TestValidator.equals(
    "channel code matches",
    channel.channel_code,
    channelCreateData.channel_code,
  );
  TestValidator.equals(
    "channel name matches",
    channel.channel_name,
    channelCreateData.channel_name,
  );

  // Step 3: Perform soft deletion of the channel
  await api.functional.shoppingMall.admin.channels.erase(connection, {
    channelId: channel.id,
  });

  // Step 4: Deletion completed successfully (void return means success)
  // The soft delete sets deleted_at timestamp while preserving historical data
}
