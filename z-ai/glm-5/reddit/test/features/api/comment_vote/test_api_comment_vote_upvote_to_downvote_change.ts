import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_vote_cast } from "../../../generate/generate_random_community_platform_member_posts_comments_vote_cast";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test changing a comment vote from upvote to downvote.
 *
 * This test verifies:
 * 1. Vote type can be changed from upvote to downvote
 * 2. The same vote record is updated (not a new one created)
 * 3. updated_at timestamp reflects the modification time
 * 4. deleted_at remains null (vote still active)
 */
export async function test_api_comment_vote_upvote_to_downvote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (voter) authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A creates a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: { postType: "text" },
      },
    );
  typia.assert(post);
  // 4. Member B (comment author) authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 5. Member B creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Member A casts initial upvote on the comment
  const initialVote =
    await generate_random_community_platform_member_posts_comments_vote_cast(
      memberAConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { vote_type: "upvote" },
      },
    );
  typia.assert(initialVote);
  // Record initial vote details
  const initialVoteId = initialVote.id;
  const initialCreatedAt = initialVote.createdAt;
  // Test: Member A changes vote from upvote to downvote
  const changedVote =
    await api.functional.communityPlatform.member.posts.comments.vote.cast(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(changedVote);
  // Validate: Response has correct vote_type
  TestValidator.equals(
    "vote type changed to downvote",
    changedVote.voteType,
    "downvote",
  );
  // Validate: Same vote record updated (not a new one created)
  TestValidator.equals("same vote record ID", changedVote.id, initialVoteId);
  // Validate: updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at reflects modification time",
    new Date(changedVote.updatedAt).getTime() >=
      new Date(initialCreatedAt).getTime(),
  );
  // Validate: deleted_at remains null (vote still active)
  TestValidator.equals(
    "vote is still active (not deleted)",
    changedVote.deletedAt,
    null,
  );
  // Validate: Voter information is correct
  TestValidator.equals("voter is Member A", changedVote.member.id, memberA.id);
}
