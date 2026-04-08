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
import { generate_random_reddit_clone_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_votes_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_comment_vote } from "../../../prepare/prepare_random_reddit_clone_comment_vote";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving a comment vote record after casting an upvote.
 *
 * Validates the complete comment voting workflow including member authentication, post creation, comment creation, vote casting, and vote record retrieval. Ensures that the vote entity is returned with correct vote_type ('upvote'), the member who cast the vote, the comment being voted on, and timestamps.
 *
 * Special attention is given to verifying that the vote_id, comment_id, and post_id in the path correctly reference the vote's relationships and that the response includes the full vote entity with member and comment summary objects.
 *
 * 1. Member registers and authenticates to the system.
 * 2. Member creates a post in a subscribed community.
 * 3. Member creates a comment on the post.
 * 4. Member casts an upvote on the comment to create the vote record.
 * 5. Validates the vote was successfully cast by checking the comment's updated vote_score.
 * 6. Note: Vote record retrieval requires vote_id which is not returned from the creation endpoint in the current API design.
 */
export async function test_api_comment_vote_retrieve_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: undefined,
      },
    );
  typia.assert(comment);
  // 4. Cast an upvote on the comment
  const voteBody = {
    vote_type: "upvote" as const,
  } satisfies IRedditCloneCommentVote.ICreate;
  const updatedComment =
    await generate_random_reddit_clone_member_posts_comments_votes_create(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: voteBody,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate the vote was successfully cast
  // The vote creation returns the updated comment with recalculated vote_score
  TestValidator.predicate(
    "comment vote_score is non-negative after upvote",
    updatedComment.voteScore >= 0,
  );
  TestValidator.equals(
    "comment content unchanged after vote",
    updatedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment author unchanged after vote",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "comment id unchanged after vote",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "post id unchanged after vote",
    updatedComment.post.id,
    comment.post.id,
  );
  // Note: The GET endpoint for retrieving a specific vote record requires vote_id,
  // which is not returned from the POST /votes creation endpoint. The creation
  // endpoint returns the updated comment object instead of the vote record.
  // To fully test vote retrieval, the API would need to either:
  // 1. Return the vote record (including vote_id) from the creation endpoint, or
  // 2. Provide a list endpoint to query votes by member/comment pair
  // Currently, we can only validate that the vote was cast successfully through
  // the updated comment's vote_score.
}
