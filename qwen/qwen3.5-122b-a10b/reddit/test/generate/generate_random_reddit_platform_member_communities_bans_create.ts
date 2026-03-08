import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_community_ban } from "../prepare/prepare_random_reddit_platform_community_ban";

export async function generate_random_reddit_platform_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformCommunityBan.ICreate> | undefined;
    params?: {
      communityId: string;
    };
  },
): Promise<IRedditPlatformCommunityBan> {
  const prepared: IRedditPlatformCommunityBan.ICreate =
    prepare_random_reddit_platform_community_ban(props.body);
  const result: IRedditPlatformCommunityBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      connection,
      {
        communityId: props.params?.communityId ?? "",
        body: prepared,
      },
    );
  return result;
}