import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsChannel";
import { prepare_random_community_bbs_channel } from "../prepare/prepare_random_community_bbs_channel";
export async function generate_random_community_bbs_admin_channels_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsChannel.ICreate>;
  },
): Promise<ICommunityBbsChannel> {
  const prepared: ICommunityBbsChannel.ICreate =
    prepare_random_community_bbs_channel(props.body);
  const result: ICommunityBbsChannel =
    await api.functional.communityBbs.admin.channels.create(connection, {
      body: prepared,
    });
  return result;
}
