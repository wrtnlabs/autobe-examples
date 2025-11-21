import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";

/**
 * Comprehensive channel update workflow test for administrator functionality.
 *
 * This test validates that platform administrators can successfully modify
 * existing channel configurations while maintaining data integrity and platform
 * consistency. The scenario involves administrator authentication, initial
 * channel creation, channel update operations with various field modifications,
 * validation of updated channel properties, and testing channel name uniqueness
 * enforcement.
 */
export async function test_api_channel_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!" satisfies string &
    tags.Format<"password">;

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial channel for testing modification
  const initialChannelData = {
    name: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: true,
    status: "active",
  } satisfies ICommunityPlatformChannel.ICreate;

  const initialChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: initialChannelData,
    });
  typia.assert(initialChannel);

  // Step 3: Update channel with modified properties
  const updateData = {
    name: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: false,
    status: "draft",
  } satisfies ICommunityPlatformChannel.IUpdate;

  const updatedChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: initialChannel.name,
      body: updateData,
    });
  typia.assert(updatedChannel);

  // Step 4: Validate updated channel properties
  TestValidator.equals(
    "channel ID should remain unchanged",
    updatedChannel.id,
    initialChannel.id,
  );
  TestValidator.equals(
    "channel name should be updated",
    updatedChannel.name,
    updateData.name,
  );
  TestValidator.equals(
    "display name should be updated",
    updatedChannel.display_name,
    updateData.display_name,
  );
  TestValidator.equals(
    "description should be updated",
    updatedChannel.description,
    updateData.description,
  );
  TestValidator.equals(
    "sort order should be updated",
    updatedChannel.sort_order,
    updateData.sort_order,
  );
  TestValidator.equals(
    "is_active should be updated",
    updatedChannel.is_active,
    updateData.is_active,
  );
  TestValidator.equals(
    "status should be updated",
    updatedChannel.status,
    updateData.status,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedChannel.updated_at,
    initialChannel.updated_at,
  );

  // Step 5: Test partial update (only specific fields)
  const partialUpdateData = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformChannel.IUpdate;

  const partiallyUpdatedChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: updatedChannel.name,
      body: partialUpdateData,
    });
  typia.assert(partiallyUpdatedChannel);

  // Validate partial update results
  TestValidator.equals(
    "channel ID should remain unchanged after partial update",
    partiallyUpdatedChannel.id,
    updatedChannel.id,
  );
  TestValidator.equals(
    "channel name should remain unchanged after partial update",
    partiallyUpdatedChannel.name,
    updatedChannel.name,
  );
  TestValidator.equals(
    "display name should be updated in partial update",
    partiallyUpdatedChannel.display_name,
    partialUpdateData.display_name,
  );
  TestValidator.equals(
    "description should be updated in partial update",
    partiallyUpdatedChannel.description,
    partialUpdateData.description,
  );
  TestValidator.equals(
    "sort order should remain unchanged after partial update",
    partiallyUpdatedChannel.sort_order,
    updatedChannel.sort_order,
  );
  TestValidator.equals(
    "is_active should remain unchanged after partial update",
    partiallyUpdatedChannel.is_active,
    updatedChannel.is_active,
  );
  TestValidator.equals(
    "status should remain unchanged after partial update",
    partiallyUpdatedChannel.status,
    updatedChannel.status,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after partial update",
    partiallyUpdatedChannel.updated_at,
    updatedChannel.updated_at,
  );

  // Step 6: Test channel name uniqueness enforcement
  // Create another channel to test name conflict
  const secondChannelData = {
    name: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: true,
    status: "active",
  } satisfies ICommunityPlatformChannel.ICreate;

  const secondChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: secondChannelData,
    });
  typia.assert(secondChannel);

  // Test that we cannot create a channel with an existing name
  await TestValidator.error(
    "should not create channel with duplicate name",
    async () => {
      await api.functional.communityPlatform.admin.channels.create(connection, {
        body: {
          name: secondChannel.name,
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
          status: "active",
        } satisfies ICommunityPlatformChannel.ICreate,
      });
    },
  );

  // Step 7: Test updating channel with only visual assets
  const visualUpdateData = {
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformChannel.IUpdate;

  const visuallyUpdatedChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: secondChannel.name,
      body: visualUpdateData,
    });
  typia.assert(visuallyUpdatedChannel);

  TestValidator.equals(
    "icon_url should be updated",
    visuallyUpdatedChannel.icon_url,
    visualUpdateData.icon_url,
  );
  TestValidator.equals(
    "banner_url should be updated",
    visuallyUpdatedChannel.banner_url,
    visualUpdateData.banner_url,
  );

  // Step 8: Test status transitions
  const statusUpdateData = {
    is_active: false,
    status: "draft",
  } satisfies ICommunityPlatformChannel.IUpdate;

  const statusUpdatedChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: visuallyUpdatedChannel.name,
      body: statusUpdateData,
    });
  typia.assert(statusUpdatedChannel);

  TestValidator.equals(
    "is_active should be updated to false",
    statusUpdatedChannel.is_active,
    false,
  );
  TestValidator.equals(
    "status should be updated to draft",
    statusUpdatedChannel.status,
    "draft",
  );
}
