import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformChannelSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannelSettings";
import { prepare_random_community_platform_channel } from "../prepare/prepare_random_community_platform_channel";
export async function generate_random_community_platform_admin_channels_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformChannel.ICreate>;
  },
): Promise<ICommunityPlatformChannel> {
  const prepared: ICommunityPlatformChannel.ICreate =
    prepare_random_community_platform_channel(props.body);
  const result: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: prepared,
    });
  return result;
}
