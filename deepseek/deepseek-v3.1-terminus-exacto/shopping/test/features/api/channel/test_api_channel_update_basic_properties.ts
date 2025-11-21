import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test updating basic channel properties including name, description, and
 * status.
 *
 * This E2E test validates the complete workflow of channel property updates:
 *
 * 1. Administrator account creation for authentication
 * 2. Initial channel creation with basic properties
 * 3. Sequential updates to channel name, description, status, and configuration
 * 4. Validation of immutable channel code property
 * 5. Verification of updated channel details with proper timestamps
 */
export async function test_api_channel_update_basic_properties(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ channel_management: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create initial channel to be updated
  const initialChannelCode = RandomGenerator.alphaNumeric(8);
  const initialChannelName = RandomGenerator.paragraph({ sentences: 2 });

  const createdChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: initialChannelCode,
        name: initialChannelName,
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ theme: "default", layout: "grid" }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(createdChannel);

  // Step 3: Test updating channel name
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const nameUpdatedChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: createdChannel.code,
      body: {
        name: updatedName,
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(nameUpdatedChannel);

  TestValidator.equals(
    "channel name should be updated after name update",
    nameUpdatedChannel.name,
    updatedName,
  );
  TestValidator.equals(
    "channel code should remain unchanged after name update",
    nameUpdatedChannel.code,
    createdChannel.code,
  );

  // Step 4: Test updating channel description
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const descUpdatedChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: createdChannel.code,
      body: {
        description: updatedDescription,
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(descUpdatedChannel);

  TestValidator.equals(
    "channel description should be updated after description update",
    descUpdatedChannel.description,
    updatedDescription,
  );
  TestValidator.equals(
    "channel name should persist from previous update",
    descUpdatedChannel.name,
    updatedName,
  );

  // Step 5: Test updating channel status
  const statusUpdatedChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: createdChannel.code,
      body: {
        status: "maintenance",
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(statusUpdatedChannel);

  TestValidator.equals(
    "channel status should be updated to maintenance",
    statusUpdatedChannel.status,
    "maintenance",
  );

  // Step 6: Test updating channel configuration
  const updatedConfig = JSON.stringify({
    theme: "dark",
    layout: "list",
    features: ["search", "filter"],
  });
  const configUpdatedChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: createdChannel.code,
      body: {
        configuration: updatedConfig,
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(configUpdatedChannel);

  // Step 7: Validate timestamp updates
  TestValidator.predicate(
    "updated_at timestamp should be after created_at timestamp",
    new Date(configUpdatedChannel.updated_at) >
      new Date(configUpdatedChannel.created_at),
  );

  // Step 8: Test multiple property updates simultaneously
  const finalUpdatedChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: createdChannel.code,
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "planned",
        configuration: JSON.stringify({ theme: "light", layout: "card" }),
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(finalUpdatedChannel);

  TestValidator.equals(
    "channel code should remain immutable throughout all updates",
    finalUpdatedChannel.code,
    createdChannel.code,
  );
}
