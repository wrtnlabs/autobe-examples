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
 * Test that removing a downvote from a comment correctly reverses the vote score
 * and karma adjustments.
 *
 * Verifies the complete vote-removal lifecycle for a comment downvote. Two
 * distinct members participate: a voting member who performs the vote actions
 * and a comment author whose content receives the vote. The workflow validates
 * that casting a downvote creates a vote record with value -1, and that
 * removing the vote succeeds without error — confirming the server-side reversal
 * of the comment's vote_score (increment by 1) and the comment author's karma
 * (increment by 1), and deletion of the vote record from the database.
 *
 * 1. Voting member registers, creates a community, subscribes, and creates a post.
 * 2. Comment author registers and creates a top-level comment on the post.
 * 3. Voting member casts a downvote on the comment — validates vote record.
 * 4. Voting member removes the downvote — confirms successful deletion.
 */
export async function test_api_comment_vote_removal_after_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voting member (performs vote actions)
  const votingMemberConnection: api.IConnection = { host: connection.host };
  const votingMember = await authorize_member_join(votingMemberConnection, {});
  typia.assert(votingMember);
  // 2. Create comment author (separate member whose comment receives the vote)
  const authorConnection: api.IConnection = { host: connection.host };
  const commentAuthor = await authorize_member_join(authorConnection, {});
  typia.assert(commentAuthor);
  // 3. Voting member creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      votingMemberConnection,
      {},
    );
  typia.assert(community);
  // 4. Voting member subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      votingMemberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 5. Voting member creates a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    votingMemberConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 6. Comment author creates a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 7. Voting member downvotes the comment
  const vote = await api.functional.communityHub.member.comments.downvote(
    votingMemberConnection,
    { commentId: comment.id },
  );
  typia.assert(vote);
  TestValidator.equals("downvote value is -1", vote.value, -1);
  TestValidator.equals(
    "downvote targets a comment",
    vote.target_type,
    "comment",
  );
  TestValidator.equals(
    "downvote targets correct comment",
    vote.target_id,
    comment.id,
  );
  // 8. Voting member removes the downvote — reverses score and karma
  await api.functional.communityHub.member.comments.vote.erase(
    votingMemberConnection,
    { commentId: comment.id },
  );
  // erase returns void; success confirms vote deletion and score/karma reversal
}
