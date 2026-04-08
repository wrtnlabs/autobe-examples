import api from "@ORGANIZATION/PROJECT-api";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_reddit_clone_community_ban } from "../prepare/prepare_random_reddit_clone_community_ban";

export async function generate_random_reddit_clone_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunityBan.ICreate>;
    params: {
      communityCode: string;
    };
  },
): Promise<IRedditCloneCommunityBan> {
  const prepared: IRedditCloneCommunityBan.ICreate =
    prepare_random_reddit_clone_community_ban(props.body);
  const result: IRedditCloneCommunityBan =
    await api.functional.redditClone.member.communities.bans.create(
      connection,
      {
        body: prepared,
        communityCode: props.params.communityCode,
      },
    );
  return result;
}