import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_community_ban } from "../prepare/prepare_random_reddit_like_community_community_ban";

export async function generate_random_reddit_like_community_member_communities_community_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IREdditLikeCommunityCommunityBan.ICreate>;
    params?: {
      communityId: string;
    };
  },
): Promise<IREdditLikeCommunityCommunityBan> {
  const prepared: IREdditLikeCommunityCommunityBan.ICreate =
    prepare_random_reddit_like_community_community_ban(props.body);
  const result: IREdditLikeCommunityCommunityBan =
    await api.functional.redditLikeCommunity.member.communities.community_bans.create(
      connection,
      {
        communityId: (props.params?.communityId!) satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
        body: prepared,
      },
    );
  return result;
}