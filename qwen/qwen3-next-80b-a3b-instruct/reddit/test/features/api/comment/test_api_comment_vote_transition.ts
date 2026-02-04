import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_index } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_index";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_vote_transition(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to enable voting
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a post to host the comment
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {},
    );
  typia.assert(post);
  // Step 3: Create a comment to vote on
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 4: Verify initial comment score is 0
  const commentWithScore = typia.assert<ICommunityPlatformComment>(comment);
  // Step 5: Upvote the comment (should increase score to 1 and member karma by 1)
  const upvotedComment =
    await generate_random_community_platform_member_posts_comments_votes_index(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { upvote: true } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(upvotedComment);
  // Step 6: Change vote from upvote to downvote (should decrease score to -1 and karma by 2)
  const downvotedComment =
    await generate_random_community_platform_member_posts_comments_votes_index(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { upvote: false } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvotedComment);
  // Step 7: Remove the vote (should reset score to 0 and karma by 1)
  // To remove a vote, we must send the exact same direction as the current vote
  const removedVoteComment =
    await generate_random_community_platform_member_posts_comments_votes_index(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { upvote: false } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(removedVoteComment);
}
