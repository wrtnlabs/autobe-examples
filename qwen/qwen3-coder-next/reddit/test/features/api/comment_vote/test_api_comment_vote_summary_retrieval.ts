import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommentVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVotesSum";
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
import { generate_random_reddit_like_member_comments_vote_create } from "../../../generate/generate_random_reddit_like_member_comments_vote_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_comment_vote } from "../../../prepare/prepare_random_reddit_like_comment_vote";

export async function test_api_comment_vote_summary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "12345678",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a comment with a random postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        },
      },
    );
  typia.assert(comment);
  // 3. Cast upvote
  await generate_random_reddit_like_member_comments_vote_create(
    memberConnection,
    {
      params: { commentId: comment.id },
      body: { value: 1 },
    },
  );
  // 4. Cast another upvote from different member
  const upvoteMemberConnection: api.IConnection = { host: connection.host };
  const upvoteMember = await authorize_member_join(upvoteMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "12345678",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(upvoteMember);
  await generate_random_reddit_like_member_comments_vote_create(
    upvoteMemberConnection,
    {
      params: { commentId: comment.id },
      body: { value: 1 },
    },
  );
  // 5. Cast downvote from third member
  const downvoteMemberConnection: api.IConnection = { host: connection.host };
  const downvoteMember = await authorize_member_join(downvoteMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "12345678",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(downvoteMember);
  await generate_random_reddit_like_member_comments_vote_create(
    downvoteMemberConnection,
    {
      params: { commentId: comment.id },
      body: { value: -1 },
    },
  );
  // 6. Retrieve and validate vote summary
  const summary = await api.functional.redditLike.comments.votes.summary(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(summary);
  TestValidator.equals("upvote count is 2", summary.upvote_count, 2);
  TestValidator.equals("downvote count is 1", summary.downvote_count, 1);
  TestValidator.equals("vote_sum = upvotes - downvotes", summary.vote_sum, 1);
  TestValidator.predicate("last_vote_at is set", summary.last_vote_at !== null);
}
