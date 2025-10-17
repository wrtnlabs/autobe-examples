import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test complete sales channel configuration update workflow.
 *
 * This test validates the end-to-end process of updating sales channel
 * configuration by an authenticated admin user. The workflow demonstrates:
 *
 * 1. Admin authentication and authorization token acquisition
 * 2. Sales channel creation with initial configuration
 * 3. Channel configuration update (modifying channel name)
 * 4. Validation of updated channel properties
 *
 * The test ensures that:
 *
 * - Admin can successfully authenticate and obtain authorization
 * - Channel creation works with valid channel_code and channel_name
 * - Channel updates are applied correctly without affecting immutable properties
 * - All response data matches expected types and business rules
 */
export async function test_api_channel_configuration_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Create initial sales channel
  const initialChannelCode = `channel_${RandomGenerator.alphaNumeric(8)}`;
  const initialChannelName = `Channel ${RandomGenerator.name()}`;

  const channelCreateBody = {
    channel_code: initialChannelCode,
    channel_name: initialChannelName,
  } satisfies IShoppingMallChannel.ICreate;

  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreateBody,
    });
  typia.assert(createdChannel);

  // Validate created channel properties
  TestValidator.equals(
    "created channel code matches",
    createdChannel.channel_code,
    initialChannelCode,
  );
  TestValidator.equals(
    "created channel name matches",
    createdChannel.channel_name,
    initialChannelName,
  );

  // Step 3: Update channel configuration
  const updatedChannelName = `Updated ${RandomGenerator.name()}`;

  const channelUpdateBody = {
    channel_name: updatedChannelName,
  } satisfies IShoppingMallChannel.IUpdate;

  const updatedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelId: createdChannel.id,
      body: channelUpdateBody,
    });
  typia.assert(updatedChannel);

  // Step 4: Validate updated channel properties
  TestValidator.equals(
    "channel ID remains unchanged",
    updatedChannel.id,
    createdChannel.id,
  );
  TestValidator.equals(
    "channel code remains unchanged",
    updatedChannel.channel_code,
    initialChannelCode,
  );
  TestValidator.equals(
    "channel name was updated",
    updatedChannel.channel_name,
    updatedChannelName,
  );
  TestValidator.notEquals(
    "channel name changed from original",
    updatedChannel.channel_name,
    initialChannelName,
  );
}
