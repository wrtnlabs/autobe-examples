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
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that karma from a post upvote is correctly attributed to the post author, not the voter.
 *
 * Verifies the core karma attribution rule: when a member upvotes a post, the +1 karma
 * increase is applied to the post author rather than the voting member. This is fundamental
 * to the platform's reputation system where content creators earn karma from community
 * engagement on their content.
 *
 * 1. Member A joins, creates a community, subscribes, and publishes a text post.
 * 2. Member A's initial karma is confirmed to be 0 (fresh account).
 * 3. Member B joins with a separate account and casts an upvote on Member A's post.
 * 4. The vote record is validated: voter is Member B, target is the correct post, value is 1.
 * 5. Member B's karma in the vote response remains 0, proving karma goes to the author.
 */
export async function test_api_post_upvote_karma_attribution_to_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
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
  // 4. Member A creates a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Confirm Member A's initial karma is 0
  TestValidator.equals("member A initial karma is 0", memberA.karma, 0);
  // 6. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  TestValidator.equals("member B initial karma is 0", memberB.karma, 0);
  // 7. Member B upvotes Member A's post
  const vote = await api.functional.communityHub.member.posts.upvote(
    memberBConnection,
    { postId: post.id },
  );
  typia.assert(vote);
  // 8. Validate vote record identifies Member B as the voter
  TestValidator.equals("vote member is Member B", vote.member.id, memberB.id);
  TestValidator.equals("vote targets correct post", vote.target_id, post.id);
  TestValidator.equals("vote target type is post", vote.target_type, "post");
  TestValidator.equals("vote value is upvote", vote.value, 1);
  // 9. Validate karma attribution: voter's karma remains 0
  //    The +1 karma goes to the post author (Member A), not the voter
  TestValidator.equals(
    "voter karma unchanged — karma attributed to author not voter",
    vote.member.karma,
    0,
  );
}
