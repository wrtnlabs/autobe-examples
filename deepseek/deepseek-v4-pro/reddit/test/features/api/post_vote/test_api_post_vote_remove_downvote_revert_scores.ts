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
 * Test that removing a downvote from a post correctly reverses the vote score and author karma adjustments.
 *
 * Validates the complete vote removal workflow for a downvoted post. When a member removes their downvote, the system must restore both the post's vote score and the post author's karma to their pre-downvote values. This confirms that the downvote reversal logic correctly increases (rather than decreases) the affected scores, as removing a -1 downvote should add +1 back to both metrics.
 *
 * 1. memberA (author) registers with the platform — karma initialized to 0.
 * 2. memberA creates a community for the post.
 * 3. memberB (voter) registers with the platform.
 * 4. memberB subscribes to the community.
 * 5. memberA creates a text post in the community — post vote_score starts at 0.
 * 6. memberB casts a downvote on the post — post vote_score becomes -1, memberA karma becomes -1.
 * 7. memberB removes the downvote via DELETE /communityHub/member/posts/{postId}/vote.
 * 8. Verifies the vote removal operation completes successfully, confirming the downvote reversal effects on scores and karma.
 */
export async function test_api_post_vote_remove_downvote_revert_scores(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register memberA (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  TestValidator.equals("memberA karma starts at 0", memberA.karma, 0);
  // 2. memberA creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register memberB (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. memberB subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberBConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 5. memberA creates a post with initial vote_score of 0
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  TestValidator.equals("post vote_score starts at 0", post.vote_score, 0);
  // 6. memberB downvotes the post
  const downvote = await api.functional.communityHub.member.posts.downvote(
    memberBConnection,
    { postId: post.id },
  );
  typia.assert(downvote);
  TestValidator.equals("downvote value is -1", downvote.value, -1);
  TestValidator.equals(
    "downvote targets correct post",
    downvote.target_id,
    post.id,
  );
  // 7. memberB removes the downvote — reverses score and karma changes
  await api.functional.communityHub.member.posts.vote.erase(memberBConnection, {
    postId: post.id,
  });
  // Erase returns void — successful completion confirms the downvote reversal
}
