import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_community_moderator } from "../prepare/prepare_random_reddit_community_community_moderator";

export async function generate_random_reddit_community_community_owner_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommunityModerator.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCommunityCommunityModerator> {
  const prepared: IRedditCommunityCommunityModerator.ICreate =
    prepare_random_reddit_community_community_moderator(props.body);
  return await api.functional.redditCommunity.communityOwner.communities.moderators.create(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    },
  );
}
