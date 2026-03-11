import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_vote_update } from "../../../generate/generate_random_reddit_like_member_comments_vote_update";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_comment_vote } from "../../../prepare/prepare_random_reddit_like_comment_vote";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a post
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Cast first vote (upvote)
  const firstVote = await api.functional.redditLike.member.comments.vote.update(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(firstVote);
  TestValidator.equals("first vote value", firstVote.value, 1);
  TestValidator.equals(
    "first vote comment id",
    firstVote.comment.id,
    comment.id,
  );
  TestValidator.equals("first vote member id", firstVote.member.id, member.id);
  // 5. Change vote to downvote
  const secondVote =
    await api.functional.redditLike.member.comments.vote.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          value: -1,
        } satisfies IRedditLikeCommentVote.ICreate,
      },
    );
  typia.assert(secondVote);
  TestValidator.equals("second vote value", secondVote.value, -1);
  TestValidator.equals(
    "second vote comment id",
    secondVote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "second vote member id",
    secondVote.member.id,
    member.id,
  );
  // 6. Verify vote count changed by 2 (from +1 to -1)
  TestValidator.equals(
    "comment vote score",
    comment.vote_score + 2,
    secondVote.comment.vote_score,
  );
  // 7. Verify member karma changed accordingly
  const updatedMember = member; // karma should reflect vote change
  TestValidator.predicate(
    "member karma changed by 2",
    Math.abs(updatedMember.karma_score - member.karma_score) === 2,
  );
  // 8. Verify only one vote exists (no duplication)
  const voteList = await api.functional.redditLike.member.comments.vote.update(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        value: -1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(voteList);
  TestValidator.equals("same vote record", voteList.id, secondVote.id);
}
