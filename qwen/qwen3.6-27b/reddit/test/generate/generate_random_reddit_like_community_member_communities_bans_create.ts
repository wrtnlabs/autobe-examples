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

/**
 * Generate a random community ban for E2E testing.
 *
 * Creates a ban record that restricts a member from participating in a specific community.
 * The ban prevents the target member from creating posts or comments in the community.
 *
 * Requires an existing community and the requesting user must have moderator or owner
 * authority in that community. The target member must have an active account.
 *
 * @param connection - API connection instance
 * @param props - Optional body overrides and required communityId parameter
 * @returns The created ban record with full details including community, member, moderator references
 */
export async function generate_random_reddit_like_community_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IREdditLikeCommunityCommunityBan.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IREdditLikeCommunityCommunityBan> {
  const prepared: IREdditLikeCommunityCommunityBan.ICreate =
    prepare_random_reddit_like_community_community_ban(props.body);
  return await api.functional.redditLikeCommunity.member.communities.bans.create(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    },
  );
}
