import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_ban } from "../prepare/prepare_random_reddit_community_ban";

export async function generate_random_reddit_community_community_moderator_bans_create(
  connection: IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityBan.ICreate> | undefined;
  },
): Promise<IRedditCommunityBan> {
  const prepared: IRedditCommunityBan.ICreate =
    prepare_random_reddit_community_ban(props.body);
  return await api.functional.redditCommunity.communityModerator.bans.create(
    connection,
    {
      body: prepared,
    },
  );
}
