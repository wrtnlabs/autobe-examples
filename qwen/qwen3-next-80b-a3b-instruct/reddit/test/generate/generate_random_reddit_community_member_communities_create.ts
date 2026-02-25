import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_community } from "../prepare/prepare_random_reddit_community_community";

export async function generate_random_reddit_community_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommunity.ICreate> | undefined;
  },
): Promise<IRedditCommunityCommunity> {
  const prepared: IRedditCommunityCommunity.ICreate =
    prepare_random_reddit_community_community(props.body);
  return await api.functional.redditCommunity.member.communities.create(
    connection,
    {
      body: prepared,
    },
  );
}
