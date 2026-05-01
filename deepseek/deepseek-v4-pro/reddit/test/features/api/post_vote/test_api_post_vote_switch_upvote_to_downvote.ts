import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_votes_create } from "../../../generate/generate_random_community_hub_member_votes_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_vote } from "../../../prepare/prepare_random_community_hub_vote";

/**
 * Test that switching an upvote to a downvote on the same post atomically updates
 * the vote record in-place.
 *
 * Verifies that when a member changes their vote direction from upvote to downvote
 * on a previously-voted post, the existing vote record is updated rather than
 * replaced. The vote id is preserved, the original created_at timestamp is maintained,
 * and updated_at advances past created_at to reflect the direction switch. The value
 * field correctly reflects the new downvote direction.
 *
 * The vote score cascade (post vote_score -2 delta, author karma -2 delta ending at -1)
 * is handled on the server side per the karma calculation rules but cannot be
 * directly verified without GET endpoints for post and member detail.
 *
 * 1. Member A joins, creates a community, subscribes, and publishes a text post.
 * 2. Member B joins as a separate member.
 * 3. Member B upvotes Member A's post — capture the returned vote id and created_at.
 * 4. Member B switches to downvote on the same post — verify the vote record is
 *    atomically updated with preserved id/created_at and advanced updated_at.
 */
export async function test_api_post_vote_switch_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins the platform
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Member B joins as a separate member
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Step 1: Member B upvotes Member A's post
  const upvote = await api.functional.communityHub.member.votes.create(
    memberBConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      } satisfies ICommunityHubVote.ICreate,
    },
  );
  typia.assert(upvote);
  // 7. Step 2: Member B switches from upvote to downvote on the same post
  const downvote = await api.functional.communityHub.member.votes.create(
    memberBConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: -1,
      } satisfies ICommunityHubVote.ICreate,
    },
  );
  typia.assert(downvote);
  // 8. Validate atomic in-place update
  TestValidator.equals(
    "vote id preserved across switch",
    downvote.id,
    upvote.id,
  );
  TestValidator.equals("vote value switched to -1", downvote.value, -1);
  TestValidator.equals(
    "created_at preserved from original upvote",
    downvote.created_at,
    upvote.created_at,
  );
  TestValidator.predicate(
    "updated_at reflects switch moment",
    downvote.updated_at > downvote.created_at,
  );
}
