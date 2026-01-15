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
export async function test_api_channel_update_primary_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Step 2: Create channel using admin connection
  const createdChannel: ICommunityPlatformChannel =
    await generate_random_community_platform_admin_channels_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_public: true,
          settings: "{}", // Use empty JSON string as required by ICommunityPlatformChannelSettings = string
        } satisfies ICommunityPlatformChannel.ICreate,
      },
    );
  typia.assert(createdChannel);
  // Step 3: Update channel with new settings
  const updatedChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.update(
      adminConnection,
      {
        channelId: createdChannel.id,
        body: {
          name: createdChannel.name,
          description: createdChannel.description,
          visibility: "private",
          moderation_level: "strict",
          content_policy: "academic", // Added required property to satisfy IUpdate interface
          // settings: "{}", // This property doesn't exist in IUpdate type
        } satisfies ICommunityPlatformChannel.IUpdate,
      },
    );
  typia.assert(updatedChannel);
  // Step 4: Validate that channel was updated correctly
  TestValidator.equals(
    "channel ID unchanged",
    updatedChannel.id,
    createdChannel.id,
  );
  TestValidator.equals(
    "channel code unchanged",
    updatedChannel.code,
    createdChannel.code,
  );
  TestValidator.equals(
    "channel name unchanged",
    updatedChannel.name,
    createdChannel.name,
  );
  TestValidator.equals(
    "channel description unchanged",
    updatedChannel.description,
    createdChannel.description,
  );
  TestValidator.equals(
    "contributor count unchanged",
    updatedChannel.contributor_count,
    createdChannel.contributor_count,
  );
  TestValidator.equals(
    "post count unchanged",
    updatedChannel.post_count,
    createdChannel.post_count,
  );
  TestValidator.equals(
    "creation timestamp unchanged",
    updatedChannel.created_at,
    createdChannel.created_at,
  );
  TestValidator.notEquals(
    "update timestamp changed",
    updatedChannel.updated_at,
    createdChannel.updated_at,
  );
  TestValidator.equals(
    "visibility updated",
    updatedChannel.visibility,
    "private",
  );
  TestValidator.equals(
    "moderation level updated",
    updatedChannel.moderation_level,
    "strict",
  );
  // TestValidator.equals( // This validation is invalid because content_policy doesn't exist on ICommunityPlatformChannel
  //   "content policy updated",
  //   updatedChannel.content_policy,
  //   "academic",
  // );
}