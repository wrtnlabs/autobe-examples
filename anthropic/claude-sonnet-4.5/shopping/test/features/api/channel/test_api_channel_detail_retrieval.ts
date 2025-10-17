import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test retrieving complete detailed information for a specific sales channel by
 * its unique identifier.
 *
 * This test validates the GET endpoint for channel detail retrieval in a
 * multi-channel e-commerce platform. The workflow creates an authenticated
 * admin account, establishes a sales channel with comprehensive configuration,
 * then retrieves and validates the channel details.
 *
 * Process:
 *
 * 1. Create and authenticate an admin account with proper role permissions
 * 2. Create a sales channel with channel code and name configuration
 * 3. Retrieve the channel details using the channel ID
 * 4. Validate that all returned properties match the created channel data
 */
export async function test_api_channel_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
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

  // Step 2: Create a sales channel with configuration
  const channelCreateData = {
    channel_code: RandomGenerator.alphaNumeric(8),
    channel_name: RandomGenerator.name(2),
  } satisfies IShoppingMallChannel.ICreate;

  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreateData,
    });
  typia.assert(createdChannel);

  // Step 3: Retrieve the channel details by ID
  const retrievedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.at(connection, {
      channelId: createdChannel.id,
    });
  typia.assert(retrievedChannel);

  // Step 4: Validate retrieved channel matches created channel
  TestValidator.equals(
    "retrieved channel id matches created channel",
    retrievedChannel.id,
    createdChannel.id,
  );

  TestValidator.equals(
    "retrieved channel code matches created channel",
    retrievedChannel.channel_code,
    createdChannel.channel_code,
  );

  TestValidator.equals(
    "retrieved channel name matches created channel",
    retrievedChannel.channel_name,
    createdChannel.channel_name,
  );
}
