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
 * Test that a member can change an existing vote from upvote to downvote on a comment.
 *
 * Validates the complete comment voting workflow including member authentication, post creation, comment creation, and vote modification. Ensures that changing a vote from upvote to downvote updates the existing vote record rather than creating a new one, and that the vote timestamps are correctly maintained.
 *
 * Special attention is given to verifying that the vote record maintains the same ID after modification, the updated_at timestamp is newer than created_at, and the vote_type correctly transitions from upvote to downvote.
 *
 * 1. Authenticate a new member user with email, password, and username.
 * 2. Create a post in a community using the authenticated member connection.
 * 3. Create a comment on that post using the authenticated member connection.
 * 4. Cast an initial upvote on the comment and verify vote_type='upvote'.
 * 5. Update the vote to downvote and verify the same vote record is modified.
 * 6. Validate that the vote record ID remains unchanged.
 * 7. Verify updated_at timestamp is newer than created_at.
 */
export async function test_api_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a post (utility function handles community subscription)
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
        body: {},
      },
    );
  typia.assert(comment);
  // 4. Cast initial upvote
  const upvote = await api.functional.redditClone.posts.comments.votes.update(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
      body: { vote_type: "upvote" } satisfies IRedditCloneCommentVote.IUpdate,
    },
  );
  typia.assert(upvote);
  // Verify initial upvote
  TestValidator.equals("initial vote is upvote", upvote.vote_type, "upvote");
  TestValidator.predicate(
    "upvote has valid timestamps",
    upvote.created_at !== undefined && upvote.updated_at !== undefined,
  );
  // 5. Update vote to downvote
  const downvote = await api.functional.redditClone.posts.comments.votes.update(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
      body: { vote_type: "downvote" } satisfies IRedditCloneCommentVote.IUpdate,
    },
  );
  typia.assert(downvote);
  // 6. Verify vote record is updated (same ID)
  TestValidator.equals("vote record ID unchanged", upvote.id, downvote.id);
  TestValidator.equals(
    "vote type changed to downvote",
    downvote.vote_type,
    "downvote",
  );
  // 7. Verify updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(downvote.updated_at).getTime() >
      new Date(downvote.created_at).getTime(),
  );
  // 8. Verify the downvote timestamp is newer than upvote timestamp
  TestValidator.predicate(
    "downvote updated_at is newer than upvote updated_at",
    new Date(downvote.updated_at).getTime() >=
      new Date(upvote.updated_at).getTime(),
  );
}
