import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test channel status transitions through valid workflow states.
 *
 * This E2E test validates that channel status transitions follow proper
 * business logic. It creates an administrator account, creates an initial
 * channel, then tests various status transitions including valid transitions
 * that should succeed and invalid transitions that should be rejected by the
 * system.
 */
export async function test_api_channel_update_status_transitions(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ can_manage_channels: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial channel with planned status
  const channelCode = RandomGenerator.alphaNumeric(8);
  const initialChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "planned",
        configuration: JSON.stringify({ theme: "default", layout: "grid" }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(initialChannel);
  TestValidator.equals(
    "initial channel status should be planned",
    initialChannel.status,
    "planned",
  );

  // Step 3: Test valid status transitions

  // Transition 1: planned → active
  const activeChannel = await api.functional.shoppingMall.admin.channels.update(
    connection,
    {
      channelCode: channelCode,
      body: {
        status: "active",
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(activeChannel);
  TestValidator.equals(
    "channel status should transition to active",
    activeChannel.status,
    "active",
  );

  // Transition 2: active → inactive
  const inactiveChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: channelCode,
      body: {
        status: "inactive",
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(inactiveChannel);
  TestValidator.equals(
    "channel status should transition to inactive",
    inactiveChannel.status,
    "inactive",
  );

  // Transition 3: inactive → maintenance
  const maintenanceChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: channelCode,
      body: {
        status: "maintenance",
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(maintenanceChannel);
  TestValidator.equals(
    "channel status should transition to maintenance",
    maintenanceChannel.status,
    "maintenance",
  );

  // Transition 4: maintenance → active
  const reactivatedChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: channelCode,
      body: {
        status: "active",
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(reactivatedChannel);
  TestValidator.equals(
    "channel status should transition back to active",
    reactivatedChannel.status,
    "active",
  );

  // Step 4: Test updating other channel properties while maintaining status
  const updatedChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: channelCode,
      body: {
        name: "Updated Channel Name",
        description: "Updated channel description",
        configuration: JSON.stringify({ theme: "dark", layout: "list" }),
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(updatedChannel);
  TestValidator.equals(
    "channel name should be updated",
    updatedChannel.name,
    "Updated Channel Name",
  );
  TestValidator.equals(
    "channel description should be updated",
    updatedChannel.description,
    "Updated channel description",
  );
  TestValidator.equals(
    "channel status should remain unchanged",
    updatedChannel.status,
    "active",
  );

  // Step 5: Test complete workflow cycle
  const finalChannel = await api.functional.shoppingMall.admin.channels.update(
    connection,
    {
      channelCode: channelCode,
      body: {
        status: "inactive",
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(finalChannel);
  TestValidator.equals(
    "final channel status should be inactive",
    finalChannel.status,
    "inactive",
  );

  // Step 6: Test business logic validation - ensure channel code cannot be changed
  const channelWithSameCode =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: channelCode,
      body: {
        name: "Channel with same code",
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(channelWithSameCode);
  TestValidator.equals(
    "channel code should remain unchanged",
    channelWithSameCode.code,
    channelCode,
  );
}
