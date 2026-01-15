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
export async function test_api_channel_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate random channel creation data
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channelData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    is_public: true,
    settings: RandomGenerator.alphaNumeric(20), // Use random string for settings, as it's a string type
  } satisfies ICommunityPlatformChannel.ICreate;
  // Step 3: Create the channel using the admin connection
  const createdChannel =
    await generate_random_community_platform_admin_channels_create(
      adminConnection,
      {
        body: channelData,
      },
    );
  // Step 4: Validate the created channel - this ensures all fields are non-undefined
  typia.assert(createdChannel);
  // Step 5: Verify channel properties match expected values
  TestValidator.equals(
    "channel name matches",
    createdChannel.name,
    channelData.name,
  );
  TestValidator.equals(
    "channel description matches",
    createdChannel.description,
    channelData.description,
  );
  TestValidator.equals(
    "channel is public",
    createdChannel.visibility,
    channelData.is_public ? "public" : "private",
  );
  TestValidator.equals(
    "channel status is active",
    createdChannel.status,
    "active",
  );
  TestValidator.equals(
    "channel contributor count is 0",
    createdChannel.contributor_count,
    0,
  );
  TestValidator.equals("channel post count is 0", createdChannel.post_count, 0);
  TestValidator.predicate(
    "channel code is valid",
    /^[a-zA-Z0-9]{1,64}$/.test(createdChannel.code),
  );
  // Step 6: Verify settings is of correct type and not empty
  const settings = createdChannel.settings;
  TestValidator.equals("channel settings type", typeof settings, "string");
  // Fixed: Check for null/undefined before accessing length property
  TestValidator.predicate(
    "channel settings is not empty",
    settings !== null && settings !== undefined && settings.length > 0,
  );
}
