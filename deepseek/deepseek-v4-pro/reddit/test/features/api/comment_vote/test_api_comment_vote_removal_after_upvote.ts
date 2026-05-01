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
 * Test that removing an upvote from a comment correctly reverses the vote
 * and the vote record is fully deleted from the database.
 *
 * Validates the complete vote removal lifecycle: an authenticated member
 * upvotes a comment written by another member, then removes that upvote.
 * The test verifies that the removal operation succeeds without errors,
 * is idempotent (removing again is a no-op), and that the old vote record
 * is truly deleted — a fresh upvote after removal creates a brand-new vote
 * with a different identifier, confirming the original vote is gone.
 *
 * Additionally confirms that upvote operations are idempotent before
 * removal — casting the same upvote twice returns the identical vote
 * record without creating duplicates or altering scores.
 *
 * 1. Voting member (Member A) registers and authenticates.
 * 2. Comment author (Member B) registers and authenticates.
 * 3. Member A creates a community and subscribes to it.
 * 4. Member A creates a text post within the community.
 * 5. Member B creates a top-level comment on the post (vote_score = 0).
 * 6. Member A upvotes Member B's comment — vote record returned with value=1.
 * 7. Verify upvote idempotency: same vote id on repeat upvote.
 * 8. Member A removes the vote — operation succeeds (void).
 * 9. Verify removal idempotency: removing again succeeds as no-op.
 * 10. Verify old vote deleted: fresh upvote yields a different vote id.
 */
export async function test_api_comment_vote_removal_after_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the voting member (Member A)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 2. Register and authenticate the comment author (Member B)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 3. Voting member creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      voterConnection,
      {},
    );
  typia.assert(community);
  // 4. Voting member subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      voterConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 5. Voting member creates a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    voterConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 6. Comment author creates a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    authorConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  TestValidator.equals("initial vote score is zero", comment.vote_score, 0);
  // 7. Voting member upvotes the comment
  const vote = await api.functional.communityHub.member.comments.upvote(
    voterConnection,
    { commentId: comment.id },
  );
  typia.assert(vote);
  TestValidator.equals("vote value is upvote (1)", vote.value, 1);
  TestValidator.equals(
    "vote target type is comment",
    vote.target_type,
    "comment",
  );
  TestValidator.equals(
    "vote target id matches comment",
    vote.target_id,
    comment.id,
  );
  // 8. Verify upvote idempotency — same vote returned on repeat
  const voteAgain = await api.functional.communityHub.member.comments.upvote(
    voterConnection,
    { commentId: comment.id },
  );
  typia.assert(voteAgain);
  TestValidator.equals(
    "idempotent upvote returns same vote id",
    voteAgain.id,
    vote.id,
  );
  TestValidator.equals("idempotent upvote value unchanged", voteAgain.value, 1);
  // 9. Voting member removes the vote
  await api.functional.communityHub.member.comments.vote.erase(
    voterConnection,
    { commentId: comment.id },
  );
  // 10. Verify vote removal idempotency — removing again is no-op
  await api.functional.communityHub.member.comments.vote.erase(
    voterConnection,
    { commentId: comment.id },
  );
  // 11. Verify old vote was truly deleted — fresh upvote creates new record
  const newVote = await api.functional.communityHub.member.comments.upvote(
    voterConnection,
    { commentId: comment.id },
  );
  typia.assert(newVote);
  TestValidator.equals("new vote has upvote value", newVote.value, 1);
  TestValidator.notEquals(
    "new vote has different id from old vote",
    newVote.id,
    vote.id,
  );
}
