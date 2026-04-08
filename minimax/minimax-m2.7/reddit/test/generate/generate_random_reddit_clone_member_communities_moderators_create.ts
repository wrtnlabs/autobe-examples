import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";

import { prepare_random_reddit_clone_community_moderator } from "../prepare/prepare_random_reddit_clone_community_moderator";

export async function generate_random_reddit_clone_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunityModerator.ICreate>;
    params: {
      communityId: string;
    };
  }
): Promise<IRedditCloneCommunityModerator> {
  const prepared: IRedditCloneCommunityModerator.ICreate =
    prepare_random_reddit_clone_community_moderator(props.body);
  return await api.functional.redditClone.member.communities.moderators.create(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    }
  );
}
