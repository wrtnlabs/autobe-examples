import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_channel } from "../prepare/prepare_random_community_platform_channel";

export async function generate_random_community_platform_user_channels_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformChannel.ICreate>;
  },
): Promise<ICommunityPlatformChannel> {
  const prepared = prepare_random_community_platform_channel(props.body);
  const result = await api.functional.communityPlatform.user.channels.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}
