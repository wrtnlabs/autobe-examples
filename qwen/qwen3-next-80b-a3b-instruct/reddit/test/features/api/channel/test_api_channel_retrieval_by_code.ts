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
export async function test_api_channel_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResult.token);
  // Step 2: Create a new channel using the authenticated admin connection
  const createdChannel =
    await generate_random_community_platform_admin_channels_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 15,
          }), // Ensure <= 100 chars
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 12,
          }), // Ensure <= 500 chars
          is_public: true,
          settings: JSON.stringify({}), // Removed satisfies ICommunityPlatformChannelSettings - JSON.stringify returns string
        } satisfies ICommunityPlatformChannel.ICreate,
      },
    );
  typia.assert(createdChannel);
  // Step 3: Retrieve the channel by code using the authenticated admin connection
  const retrievedChannel = await api.functional.communityPlatform.channels.at(
    adminConnection,
    {
      channelCode: createdChannel.code,
    },
  );
  typia.assert(retrievedChannel);
  // Step 4: Validate properties
  TestValidator.equals(
    "channel id matches",
    retrievedChannel.id,
    createdChannel.id,
  );
  TestValidator.equals(
    "channel name matches",
    retrievedChannel.name,
    createdChannel.name,
  );
  TestValidator.equals(
    "channel description matches",
    retrievedChannel.description,
    createdChannel.description,
  );
  TestValidator.equals(
    "channel code matches",
    retrievedChannel.code,
    createdChannel.code,
  );
  TestValidator.equals(
    "channel contributor count matches",
    retrievedChannel.contributor_count,
    createdChannel.contributor_count,
  );
  TestValidator.equals(
    "channel post count matches",
    retrievedChannel.post_count,
    createdChannel.post_count,
  );
  TestValidator.equals(
    "channel visibility is public",
    retrievedChannel.visibility,
    "public",
  );
  TestValidator.equals(
    "channel status is active",
    retrievedChannel.status,
    "active",
  );
  TestValidator.equals(
    "channel settings match",
    retrievedChannel.settings,
    createdChannel.settings,
  );
}