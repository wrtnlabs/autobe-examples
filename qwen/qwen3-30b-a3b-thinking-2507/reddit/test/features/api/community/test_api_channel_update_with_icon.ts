import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_channels_create } from "../../../generate/generate_random_community_platform_user_channels_create";
import { prepare_random_community_platform_channel } from "../../../prepare/prepare_random_community_platform_channel";

export async function test_api_channel_update_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as user for channel operation
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: typia.random<ICommunityPlatformUser.IJoin>(),
  });
  typia.assert(user);
  // Step 2: Create channel for update testing
  const channel = await generate_random_community_platform_user_channels_create(
    userConnection,
    { body: {} },
  );
  typia.assert(channel);
  // Step 3: Update channel with validated icon URL
  const newIconUrl = "https://example.com/channel-icon-new.png";
  const updatedChannel =
    await api.functional.communityPlatform.user.channels.update(
      userConnection,
      {
        channelId: channel.id,
        body: {
          icon_url: newIconUrl,
        } satisfies ICommunityPlatformChannel.IUpdate,
      },
    );
  typia.assert(updatedChannel);
  // Step 4: Verify channel icon was updated directly using the updatedChannel
  TestValidator.equals(
    "Channel icon URL updated correctly",
    updatedChannel.icon_url,
    newIconUrl,
  );
}
