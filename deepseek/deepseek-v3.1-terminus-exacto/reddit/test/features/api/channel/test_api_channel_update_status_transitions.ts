import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";

/**
 * Test channel status transition workflow where an administrator changes
 * channel status between active, suspended, and draft states. Validates that
 * status transitions follow proper business rules and that channel visibility
 * changes appropriately based on status. The test ensures that status changes
 * are properly tracked and that platform navigation reflects the current
 * channel status correctly.
 */
export async function test_api_channel_update_status_transitions(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial channel with draft status
  const channelName = RandomGenerator.alphabets(10).toLowerCase();
  const initialChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: channelName,
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: false,
        status: "draft",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(initialChannel);

  // Validate initial draft channel properties
  TestValidator.equals(
    "channel should have draft status",
    initialChannel.status,
    "draft",
  );
  TestValidator.equals(
    "channel should be inactive",
    initialChannel.is_active,
    false,
  );
  TestValidator.equals(
    "channel name should match",
    initialChannel.name,
    channelName,
  );

  // Step 3: Transition from draft to active status
  const activeChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: channelName,
      body: {
        status: "active",
        is_active: true,
      } satisfies ICommunityPlatformChannel.IUpdate,
    });
  typia.assert(activeChannel);

  // Validate active channel properties
  TestValidator.equals(
    "channel should have active status",
    activeChannel.status,
    "active",
  );
  TestValidator.equals(
    "channel should be active",
    activeChannel.is_active,
    true,
  );
  TestValidator.equals(
    "channel ID should remain unchanged",
    activeChannel.id,
    initialChannel.id,
  );
  TestValidator.equals(
    "channel name should remain unchanged",
    activeChannel.name,
    channelName,
  );
  TestValidator.equals(
    "display name should remain unchanged",
    activeChannel.display_name,
    initialChannel.display_name,
  );
  TestValidator.equals(
    "description should remain unchanged",
    activeChannel.description,
    initialChannel.description,
  );
  TestValidator.notEquals(
    "updated_at should change after status update",
    activeChannel.updated_at,
    initialChannel.updated_at,
  );

  // Step 4: Transition from active to suspended status
  const suspendedChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: channelName,
      body: {
        status: "suspended",
        is_active: false,
      } satisfies ICommunityPlatformChannel.IUpdate,
    });
  typia.assert(suspendedChannel);

  // Validate suspended channel properties
  TestValidator.equals(
    "channel should have suspended status",
    suspendedChannel.status,
    "suspended",
  );
  TestValidator.equals(
    "channel should be inactive",
    suspendedChannel.is_active,
    false,
  );
  TestValidator.equals(
    "channel ID should remain unchanged",
    suspendedChannel.id,
    activeChannel.id,
  );
  TestValidator.equals(
    "channel name should remain unchanged",
    suspendedChannel.name,
    channelName,
  );
  TestValidator.notEquals(
    "updated_at should change after suspension",
    suspendedChannel.updated_at,
    activeChannel.updated_at,
  );

  // Step 5: Transition from suspended back to active status
  const reactivatedChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: channelName,
      body: {
        status: "active",
        is_active: true,
      } satisfies ICommunityPlatformChannel.IUpdate,
    });
  typia.assert(reactivatedChannel);

  // Validate reactivated channel properties
  TestValidator.equals(
    "channel should have active status again",
    reactivatedChannel.status,
    "active",
  );
  TestValidator.equals(
    "channel should be active again",
    reactivatedChannel.is_active,
    true,
  );
  TestValidator.equals(
    "channel ID should remain unchanged",
    reactivatedChannel.id,
    suspendedChannel.id,
  );
  TestValidator.equals(
    "channel name should remain unchanged",
    reactivatedChannel.name,
    channelName,
  );
  TestValidator.notEquals(
    "updated_at should change after reactivation",
    reactivatedChannel.updated_at,
    suspendedChannel.updated_at,
  );

  // Final validation of complete transition cycle
  TestValidator.equals(
    "channel should end with active status",
    reactivatedChannel.status,
    "active",
  );
  TestValidator.equals(
    "channel should end as active",
    reactivatedChannel.is_active,
    true,
  );
  TestValidator.predicate(
    "created_at should remain constant throughout all transitions",
    reactivatedChannel.created_at === initialChannel.created_at,
  );
}
