import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_ban } from "../prepare/prepare_random_reddit_community_ban";

export async function generate_random_reddit_member_communities_bans_ban(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityBan.ICreate> | undefined;
    params?: {
      communityId: string;
    };
  },
): Promise<IRedditCommunityBan> {
  const prepared: IRedditCommunityBan.ICreate =
    prepare_random_reddit_community_ban(props.body);
  const result: IRedditCommunityBan =
    await api.functional.reddit.member.communities.bans.ban(connection, {
      communityId: props.params?.communityId ?? '',
      body: prepared,
    });
  return result;
}