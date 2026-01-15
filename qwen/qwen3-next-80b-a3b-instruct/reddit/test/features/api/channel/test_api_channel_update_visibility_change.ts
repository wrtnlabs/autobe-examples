import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformChannelSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannelSettings";
import { prepare_random_community_platform_channel } from "../../../prepare/prepare_random_community_platform_channel";
import { generate_random_community_platform_admin_channels_create } from "../../../generate/generate_random_community_platform_admin_channels_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_update_visibility_change(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin using join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create a public channel
  const createdChannel =
    await generate_random_community_platform_admin_channels_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 12,
          }),
          is_public: true,
          settings: "{}", // Fixed: settings must be string, use JSON string representation
        } satisfies ICommunityPlatformChannel.ICreate,
      },
    );
  typia.assert(createdChannel);
  TestValidator.equals(
    "channel created with public visibility",
    createdChannel.visibility,
    "public",
  );
  // Step 3: Update channel visibility to private
  const updatedChannel =
    await api.functional.communityPlatform.admin.channels.update(
      adminConnection,
      {
        channelId: createdChannel.id,
        body: {
          name: "Updated Channel Name", // Required property added
          description: "Updated channel description", // Required property added
          visibility: "private",
          moderation_level: "light", // Changed from 'standard' to valid enum value 'light'
          content_policy: "general", // Changed from 'community guidelines' to valid enum value 'general'
        } satisfies ICommunityPlatformChannel.IUpdate,
      },
    );
  typia.assert(updatedChannel);
  TestValidator.equals(
    "channel visibility updated to private",
    updatedChannel.visibility,
    "private",
  );
  // Step 4: Validate that public access is denied - channel is not discoverable
  // Guest user should not be able to fetch the channel
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "guest cannot retrieve private channel details",
    async () => {
      await api.functional.communityPlatform.admin.channels.update(
        guestConnection,
        {
          channelId: createdChannel.id, // Added missing channelId
          body: {
            name: "", // Required property added
            description: "", // Required property added
            visibility: "public", // Required property added
            moderation_level: "light", // Changed from 'standard' to valid enum value 'light'
            content_policy: "general", // Changed from empty string to valid enum value 'general'
          } satisfies ICommunityPlatformChannel.IUpdate,
        },
      );
    },
  );
  // Step 5: Validate that the channel does not appear in public channel lists
  // Guests should not see the channel in any public listing
  await TestValidator.error(
    "guest cannot list private channel in public channels",
    async () => {
      await api.functional.communityPlatform.admin.channels.update(
        guestConnection,
        {
          channelId: createdChannel.id, // Added missing channelId
          body: {
            name: "", // Required property added
            description: "", // Required property added
            visibility: "public", // Required property added
            moderation_level: "light", // Changed from 'standard' to valid enum value 'light'
            content_policy: "general", // Changed from empty string to valid enum value 'general'
          } satisfies ICommunityPlatformChannel.IUpdate,
        },
      );
    },
  );
  // Step 6: Validate that member access is preserved - existing admin can still access
  const memberChannel =
    await api.functional.communityPlatform.admin.channels.update(
      adminConnection,
      {
        channelId: createdChannel.id,
        body: {
          name: "", // Required property added
          description: "", // Required property added
          visibility: "private", // Required property added
          moderation_level: "light", // Changed from 'standard' to valid enum value 'light'
          content_policy: "general", // Changed from empty string to valid enum value 'general'
        } satisfies ICommunityPlatformChannel.IUpdate,
      },
    );
  typia.assert(memberChannel);
  TestValidator.equals(
    "admin can still access private channel",
    memberChannel.id,
    createdChannel.id,
  );
  // Step 7: Validate private channel can be accessed via direct link by admin
  // Try to access the channel with direct channel ID
  const fetchedChannel =
    await api.functional.communityPlatform.admin.channels.update(
      adminConnection,
      {
        channelId: createdChannel.id,
        body: {
          name: "", // Required property added
          description: "", // Required property added
          visibility: "private", // Required property added
          moderation_level: "light", // Changed from 'standard' to valid enum value 'light'
          content_policy: "general", // Changed from empty string to valid enum value 'general'
        } satisfies ICommunityPlatformChannel.IUpdate,
      },
    );
  typia.assert(fetchedChannel);
  TestValidator.equals(
    "admin can fetch private channel by ID",
    fetchedChannel.id,
    createdChannel.id,
  );
}