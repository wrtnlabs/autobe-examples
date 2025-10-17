import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_post_comments_retrieval_multiple_sorting_methods(
  connection: api.IConnection,
) {
  // Step 1: Create member account for post and comment creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for the post
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post to host diverse comments
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 5 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create multiple comments with different characteristics for sorting comparison
  const comments = await ArrayUtil.asyncRepeat(10, async (index) => {
    const sentenceCount = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<15>
    >() satisfies number as number;
    const comment =
      await api.functional.redditLike.member.posts.comments.create(connection, {
        postId: post.id,
        body: {
          reddit_like_post_id: post.id,
          content_text: RandomGenerator.paragraph({ sentences: sentenceCount }),
        } satisfies IRedditLikeComment.ICreate,
      });
    typia.assert(comment);
    return comment;
  });

  // Step 5: Retrieve comments using 'best' sorting method
  const bestSorted = await api.functional.redditLike.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        sort_by: "best",
        page: 1,
        limit: 20,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(bestSorted);
  TestValidator.predicate(
    "best sorting returns paginated results",
    bestSorted.data.length > 0,
  );

  // Step 6: Retrieve comments using 'top' sorting method
  const topSorted = await api.functional.redditLike.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        sort_by: "top",
        page: 1,
        limit: 20,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(topSorted);
  TestValidator.predicate(
    "top sorting returns paginated results",
    topSorted.data.length > 0,
  );

  // Step 7: Retrieve comments using 'new' sorting method
  const newSorted = await api.functional.redditLike.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        sort_by: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.predicate(
    "new sorting returns paginated results",
    newSorted.data.length > 0,
  );

  // Step 8: Retrieve comments using 'controversial' sorting method
  const controversialSorted =
    await api.functional.redditLike.posts.comments.index(connection, {
      postId: post.id,
      body: {
        sort_by: "controversial",
        page: 1,
        limit: 20,
      } satisfies IRedditLikeComment.IRequest,
    });
  typia.assert(controversialSorted);
  TestValidator.predicate(
    "controversial sorting returns paginated results",
    controversialSorted.data.length > 0,
  );

  // Step 9: Retrieve comments using 'old' sorting method
  const oldSorted = await api.functional.redditLike.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        sort_by: "old",
        page: 1,
        limit: 20,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(oldSorted);
  TestValidator.predicate(
    "old sorting returns paginated results",
    oldSorted.data.length > 0,
  );

  // Step 10: Verify all comments belong to the created post
  TestValidator.predicate(
    "all best sorted comments belong to post",
    bestSorted.data.every((c) => c.reddit_like_post_id === post.id),
  );
  TestValidator.predicate(
    "all top sorted comments belong to post",
    topSorted.data.every((c) => c.reddit_like_post_id === post.id),
  );
  TestValidator.predicate(
    "all new sorted comments belong to post",
    newSorted.data.every((c) => c.reddit_like_post_id === post.id),
  );
  TestValidator.predicate(
    "all controversial sorted comments belong to post",
    controversialSorted.data.every((c) => c.reddit_like_post_id === post.id),
  );
  TestValidator.predicate(
    "all old sorted comments belong to post",
    oldSorted.data.every((c) => c.reddit_like_post_id === post.id),
  );

  // Step 11: Verify 'new' sorting shows newest comments first
  if (newSorted.data.length >= 2) {
    const firstComment = newSorted.data[0];
    const secondComment = newSorted.data[1];
    typia.assert(firstComment);
    typia.assert(secondComment);
    TestValidator.predicate(
      "new sorting shows newest first",
      new Date(firstComment.created_at).getTime() >=
        new Date(secondComment.created_at).getTime(),
    );
  }

  // Step 12: Verify 'old' sorting shows oldest comments first
  if (oldSorted.data.length >= 2) {
    const firstComment = oldSorted.data[0];
    const secondComment = oldSorted.data[1];
    typia.assert(firstComment);
    typia.assert(secondComment);
    TestValidator.predicate(
      "old sorting shows oldest first",
      new Date(firstComment.created_at).getTime() <=
        new Date(secondComment.created_at).getTime(),
    );
  }

  // Step 13: Verify all sorting methods return the same total count
  TestValidator.equals(
    "all sorting methods return same record count",
    bestSorted.pagination.records,
    topSorted.pagination.records,
  );
  TestValidator.equals(
    "all sorting methods return same record count",
    topSorted.pagination.records,
    newSorted.pagination.records,
  );
  TestValidator.equals(
    "all sorting methods return same record count",
    newSorted.pagination.records,
    controversialSorted.pagination.records,
  );
  TestValidator.equals(
    "all sorting methods return same record count",
    controversialSorted.pagination.records,
    oldSorted.pagination.records,
  );
}
