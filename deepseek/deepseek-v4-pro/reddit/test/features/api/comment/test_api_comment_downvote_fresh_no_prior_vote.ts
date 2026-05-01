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
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test fresh downvote on a comment with no prior vote interaction.
 *
 * Validates the primary success path of the comment downvote endpoint. A member casts a downvote on a comment they have never voted on before, and the response is verified for correctness of the vote record including direction, target reference, voter identity, timestamp consistency, and karma side effects.
 *
 * Since the same member creates the comment and casts the downvote, the voter is also the comment author. This allows direct validation that the author's karma decreases by exactly 1 as a side effect of receiving a downvote.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a community, subscribes to it, and publishes a text post.
 * 3. Member creates a top-level comment on the post; capture initial vote_score and author karma.
 * 4. Member downvotes the comment via the downvote endpoint.
 * 5. Validates vote value is -1, target_type is 'comment', target_id matches the comment, voter identity is correct, created_at equals updated_at for a fresh vote, and author karma decreased by 1.
 */
export async function test_api_comment_downvote_fresh_no_prior_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  const initialAuthorKarma = comment.author.karma;
  // 6. Downvote the comment — fresh vote, no prior interaction
  const vote = await api.functional.communityHub.member.comments.downvote(
    memberConnection,
    { commentId: comment.id },
  );
  typia.assert(vote);
  // 7. Validate vote record
  TestValidator.equals("vote value is -1 (downvote)", vote.value, -1);
  TestValidator.equals("target_type is 'comment'", vote.target_type, "comment");
  TestValidator.equals(
    "target_id matches comment id",
    vote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "voter is the authenticated member",
    vote.member.id,
    member.id,
  );
  TestValidator.equals(
    "fresh vote — created_at equals updated_at",
    vote.created_at,
    vote.updated_at,
  );
  // Comment author's karma decreases by 1 for receiving a downvote
  TestValidator.predicate(
    "comment author karma decreased by 1",
    vote.member.karma === initialAuthorKarma - 1,
  );
}
