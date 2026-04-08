import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member can remove their vote on a comment by setting vote_type to null.
 *
 * Validates the complete comment voting workflow including vote casting and vote removal. Tests that when a member removes their vote by setting vote_type to null, the vote record is preserved for audit purposes but has no effect on the comment's vote score. The vote score should return to 0 after removing the only vote.
 *
 * Special attention is given to verifying that null votes are retained in the system but contribute neither +1 nor -1 to the scoring calculation, ensuring proper audit trail while maintaining accurate vote scores.
 *
 * 1. Authenticate a member user with email, password, and username.
 * 2. Create a post in a community with title and content.
 * 3. Create a comment on the post with content text.
 * 4. Cast an upvote on the comment to increase vote score to 1.
 * 5. Verify the vote record exists with vote_type set to 'upvote'.
 * 6. Remove the vote by setting vote_type to null.
 * 7. Verify the vote record still exists but vote_type is now null.
 * 8. Verify the comment's vote_score returns to 0 after vote removal.
 */
export async function test_api_comment_vote_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 4. Cast an upvote on the comment
  const upvote = await api.functional.redditClone.posts.comments.votes.update(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
      body: { vote_type: "upvote" } satisfies IRedditCloneCommentVote.IUpdate,
    },
  );
  typia.assert(upvote);
  // 5. Verify upvote was cast successfully
  TestValidator.equals("upvote cast", upvote.vote_type, "upvote");
  TestValidator.predicate("upvote has valid ID", upvote.id !== undefined);
  // 6. Remove the vote by setting vote_type to null
  const removedVote =
    await api.functional.redditClone.posts.comments.votes.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { vote_type: null } satisfies IRedditCloneCommentVote.IUpdate,
      },
    );
  typia.assert(removedVote);
  // 7. Verify vote record still exists but vote_type is null
  TestValidator.equals("vote removed", removedVote.vote_type, null);
  TestValidator.equals("vote record preserved", removedVote.id, upvote.id);
  // 8. Verify the comment's vote_score returns to 0
  TestValidator.predicate(
    "vote score is zero after removal",
    removedVote.comment.vote_score === 0,
  );
}
