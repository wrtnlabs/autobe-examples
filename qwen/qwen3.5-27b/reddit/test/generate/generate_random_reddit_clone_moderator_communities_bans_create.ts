import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_community_ban } from "../prepare/prepare_random_reddit_clone_community_ban";

/**
 * Generate a random community ban for E2E testing.
 *
 * Creates a ban record that restricts a member from creating posts and comments
 * in a specific community. The ban can be permanent or temporary with an
 * expiration date. Uses the prepare function to generate random ban data
 * including the ban reason and member to ban.
 *
 * The ban requires a community ID to specify which community the ban applies to.
 * The banned member can still view content in the community but cannot participate.
 */
export async function generate_random_reddit_clone_moderator_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunityBan.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCloneCommunityBan> {
  const prepared: IRedditCloneCommunityBan.ICreate =
    prepare_random_reddit_clone_community_ban(props.body);
  const result: IRedditCloneCommunityBan =
    await api.functional.redditClone.moderator.communities.bans.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
