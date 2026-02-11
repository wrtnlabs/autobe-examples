import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_ban } from "../prepare/prepare_random_reddit_platform_ban";

export async function generate_random_reddit_platform_member_reddit_platform_communities_users_bans_ban_user(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformBan.ICreate> | undefined;
    params: {
      communityId: string;
      userId: string;
    };
  },
): Promise<IRedditPlatformBan> {
  const prepared: IRedditPlatformBan.ICreate =
    prepare_random_reddit_platform_ban(props.body);
  return await api.functional.redditPlatform.member.redditPlatform.communities.users.bans.banUser(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
      userId: props.params.userId,
    },
  );
}
