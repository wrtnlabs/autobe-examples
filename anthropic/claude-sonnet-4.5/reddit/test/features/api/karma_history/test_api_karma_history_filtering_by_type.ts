import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeKarmaHistory";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeKarmaHistory";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test karma history filtering by karma type to verify users can separately
 * view post karma changes versus comment karma changes.
 *
 * This test validates the karma history filtering functionality that allows
 * users to distinguish between karma earned from posts versus comments.
 *
 * Steps:
 *
 * 1. Create first member account (content creator)
 * 2. Create a community for posting content
 * 3. Create multiple posts to generate post karma events
 * 4. Create multiple comments to generate comment karma events
 * 5. Create second member account (voter)
 * 6. Second member votes on first member's posts
 * 7. Second member votes on first member's comments
 * 8. Retrieve karma history filtered by karma_type='post'
 * 9. Verify only post karma records are returned
 * 10. Retrieve karma history filtered by karma_type='comment'
 * 11. Verify only comment karma records are returned
 */
export async function test_api_karma_history_filtering_by_type(
  connection: api.IConnection,
) {
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(firstMember);

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  const posts: IRedditLikePost[] = [];
  for (let i = 0; i < 3; i++) {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  const comments: IRedditLikeComment[] = [];
  for (let i = 0; i < 3; i++) {
    const comment = await api.functional.redditLike.member.comments.create(
      connection,
      {
        body: {
          reddit_like_post_id: posts[i % posts.length].id,
          content_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
    typia.assert(comment);
    comments.push(comment);
  }

  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(secondMember);

  for (const post of posts) {
    const vote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_value: 1,
        } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(vote);
  }

  for (const comment of comments) {
    const vote = await api.functional.redditLike.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: 1,
        } satisfies IRedditLikeCommentVote.ICreate,
      },
    );
    typia.assert(vote);
  }

  const postKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: firstMember.id,
        body: {
          karma_type: "post",
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(postKarmaHistory);

  TestValidator.predicate(
    "post karma history should contain records",
    postKarmaHistory.data.length > 0,
  );

  for (const record of postKarmaHistory.data) {
    TestValidator.equals(
      "karma record type should be post",
      record.karma_type,
      "post",
    );
  }

  const commentKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: firstMember.id,
        body: {
          karma_type: "comment",
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(commentKarmaHistory);

  TestValidator.predicate(
    "comment karma history should contain records",
    commentKarmaHistory.data.length > 0,
  );

  for (const record of commentKarmaHistory.data) {
    TestValidator.equals(
      "karma record type should be comment",
      record.karma_type,
      "comment",
    );
  }
}
