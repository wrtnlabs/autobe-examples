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

export async function test_api_channel_creation_valid_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account (authentication)
  const randomJoin = typia.random<ICommunityPlatformUser.IJoin>();
  const user = await authorize_user_join(connection, {
    body: {
      email: randomJoin.email,
      password: randomJoin.password,
      display_name: RandomGenerator.name(2),
    },
  });
  // 2. Generate channel details with constraints
  const channelName =
    RandomGenerator.alphabets(10) + "_" + RandomGenerator.alphaNumeric(5);
  const channelDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 7,
  });
  const iconUrl = typia.random<string & tags.Format<"uri">>();
  // 3. Create channel
  const channel = await generate_random_community_platform_user_channels_create(
    connection,
    {
      body: {
        name: channelName,
        description: channelDescription,
        icon_url: iconUrl,
      },
    },
  );
  // 4. Validate properties
  TestValidator.equals(
    "channel name has 10-50 characters",
    channel.name.length >= 10 && channel.name.length <= 50,
    true,
  );
  TestValidator.equals(
    "channel name has valid characters",
    /^[a-zA-Z0-9_]+$/.test(channel.name),
    true,
  );
  TestValidator.equals(
    "description length under 500 characters",
    channel.description?.length && channel.description.length <= 500,
    true,
  );
  TestValidator.equals(
    "icon URL has proper format",
    /^https?:\/\/([a-z0-9-]+\.)*[a-z]{2,}(\/[[\w-]]+)*([[[\w-\.]+)\??(\S*)?$/i.test(
      channel.icon_url ?? "",
    ),
    true,
  );
}
