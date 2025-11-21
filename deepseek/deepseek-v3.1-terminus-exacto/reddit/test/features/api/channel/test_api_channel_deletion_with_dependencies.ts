import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";

/**
 * Test channel deletion scenario where a channel with associated sections is
 * removed from the platform. Validates that deletion operations properly handle
 * channel dependencies and that related resources are either cascaded or
 * properly managed during the deletion process. The test ensures that platform
 * integrity is maintained when channels with organizational relationships are
 * removed.
 */
export async function test_api_channel_deletion_with_dependencies(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create base channel for deletion testing
  const channelName = RandomGenerator.alphabets(15); // Ensure length compliance (1-50 chars)
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: channelName,
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        icon_url: undefined,
        banner_url: undefined,
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create sections within the channel to test dependency handling
  const sectionCount = 3;
  const sections: ICommunityPlatformSection[] = [];

  for (let i = 0; i < sectionCount; i++) {
    const section: ICommunityPlatformSection =
      await api.functional.communityPlatform.admin.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: `section-${i}-${RandomGenerator.alphabets(5)}`,
            display_name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            icon_url: undefined,
            sort_order: i,
            status: "active",
            is_active: true,
          } satisfies ICommunityPlatformSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }

  // Step 4: Verify channel and sections were created successfully
  TestValidator.equals("channel name matches", channel.name, channelName);
  TestValidator.equals(
    "correct number of sections created",
    sections.length,
    sectionCount,
  );

  // Step 5: Execute channel deletion
  await api.functional.communityPlatform.admin.channels.erase(connection, {
    channelName: channel.name,
  });

  // Step 6: Verify channel deletion by attempting to access deleted channel
  await TestValidator.error(
    "deleted channel should not be accessible",
    async () => {
      await api.functional.communityPlatform.admin.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: "test-section",
            display_name: "Test Section",
            description: "Test section description",
            sort_order: 0,
            status: "active",
            is_active: true,
          } satisfies ICommunityPlatformSection.ICreate,
        },
      );
    },
  );

  // Step 7: Create a new channel with the same name to verify name uniqueness constraint
  const newChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: channelName, // Same name should be allowed after deletion
        display_name: "New Channel After Deletion",
        description: "Channel created after previous deletion",
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(newChannel);

  TestValidator.notEquals(
    "new channel should have different ID",
    newChannel.id,
    channel.id,
  );
  TestValidator.equals(
    "new channel should have same name",
    newChannel.name,
    channelName,
  );
}
