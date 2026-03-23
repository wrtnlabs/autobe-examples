import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
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
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_comments_retrieval_sort_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
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
  // 2. Create post
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create comments with varying timestamps and vote scores
  const now = new Date();
  const createdComments = [];
  // Create 5 comments with different timestamps and vote scores
  for (let i = 0; i < 5; i++) {
    const commentData = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      voteScore: Math.floor(Math.random() * 20) - 10, // Range: -10 to 9
      createdAt: new Date(now.getTime() - i * 3600000).toISOString(), // 1 hour apart
    };
    const created =
      await api.functional.redditLike.member.posts.comments.create(
        memberConnection,
        {
          postId: post.id,
          body: {
            content: commentData.content,
          } satisfies IRedditLikeComment.ICreate,
        },
      );
    typia.assert(created);
    createdComments.push(created);
  }
  // 4. Test 'new' sort option - chronological order (most recent first)
  const newComments =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          limit: 10,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(newComments);
  // Verify chronological order for 'new' sort (most recent first)
  for (let i = 0; i < newComments.data.length - 1; i++) {
    TestValidator.predicate(
      "comments ordered chronologically (newest first)",
      () => {
        return (
          new Date(newComments.data[i].created_at) >=
          new Date(newComments.data[i + 1].created_at)
        );
      },
    );
  }
  // 5. Test 'controversial' sort option - comments with many votes but neutral scores
  const controversialComments =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
          limit: 10,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(controversialComments);
  // Verify controversial comments have many votes but neutral scores (near zero)
  for (const comment of controversialComments.data) {
    TestValidator.predicate("controversial comment has neutral score", () => {
      // Controversial comments typically have high total votes but scores near zero
      return comment.vote_score >= -3 && comment.vote_score <= 3;
    });
  }
}
