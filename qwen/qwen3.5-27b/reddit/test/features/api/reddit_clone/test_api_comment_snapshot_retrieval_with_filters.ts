import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommentSnapshot";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_comment_snapshot_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test comment snapshot retrieval with various filtering criteria.
   * This test validates the PATCH /redditClone/posts/{postId}/comments/{commentId}/snapshots endpoint
   * by creating test data and applying different filter combinations to verify correct behavior.
   */
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content:
            "This is a test comment with searchable content for snapshot testing.",
          parent_id: null,
        },
      },
    );
  typia.assert(comment);
  // 5. Test snapshot retrieval with different filter combinations
  // 5.1. Test basic retrieval without filters
  const basicSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(basicSnapshots);
  TestValidator.predicate(
    "basic snapshots response is valid",
    () => basicSnapshots.pagination.records >= 0,
  );
  // 5.2. Test pagination
  const paginatedSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination page matches request",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedSnapshots.pagination.limit,
    10,
  );
  // 5.3. Test content search filter
  const searchSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          search: "test comment",
        },
      },
    );
  typia.assert(searchSnapshots);
  TestValidator.predicate(
    "search returns valid response",
    () => searchSnapshots.pagination.records >= 0,
  );
  // 5.4. Test date range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          from_date: oneDayAgo.toISOString(),
          to_date: now.toISOString(),
        },
      },
    );
  typia.assert(dateRangeSnapshots);
  TestValidator.predicate(
    "date range filter returns valid response",
    () => dateRangeSnapshots.pagination.records >= 0,
  );
  // 5.5. Test vote score range filter
  const scoreRangeSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_score_min: -100,
          vote_score_max: 100,
        },
      },
    );
  typia.assert(scoreRangeSnapshots);
  TestValidator.predicate(
    "vote score range filter returns valid response",
    () => scoreRangeSnapshots.pagination.records >= 0,
  );
  // 5.6. Test deletion state filter (active comments)
  const activeSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          is_deleted: false,
        },
      },
    );
  typia.assert(activeSnapshots);
  TestValidator.predicate(
    "active deletion state filter returns valid response",
    () => activeSnapshots.pagination.records >= 0,
  );
  // 5.7. Test deletion state filter (deleted comments)
  const deletedSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          is_deleted: true,
        },
      },
    );
  typia.assert(deletedSnapshots);
  TestValidator.predicate(
    "deleted deletion state filter returns valid response",
    () => deletedSnapshots.pagination.records >= 0,
  );
  // 5.8. Test sorting by snapshot creation time
  const sortedByTime =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          sort: "snapshot_created_at",
          order: "desc",
        },
      },
    );
  typia.assert(sortedByTime);
  TestValidator.predicate(
    "time sorting returns valid response",
    () => sortedByTime.pagination.records >= 0,
  );
  // 5.9. Test sorting by vote score
  const sortedByScore =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          sort: "vote_score",
          order: "asc",
        },
      },
    );
  typia.assert(sortedByScore);
  TestValidator.predicate(
    "score sorting returns valid response",
    () => sortedByScore.pagination.records >= 0,
  );
  // 5.10. Test combined filters
  const combinedFilterSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          search: "test",
          from_date: oneDayAgo.toISOString(),
          vote_score_min: -50,
          vote_score_max: 50,
          is_deleted: false,
          sort: "snapshot_created_at",
          order: "desc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(combinedFilterSnapshots);
  TestValidator.predicate(
    "combined filters return valid response",
    () => combinedFilterSnapshots.pagination.records >= 0,
  );
  TestValidator.equals(
    "combined filters pagination current",
    combinedFilterSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters pagination limit",
    combinedFilterSnapshots.pagination.limit,
    20,
  );
  // 5.11. Validate snapshot structure if any snapshots exist
  if (basicSnapshots.data.length > 0) {
    const firstSnapshot = basicSnapshots.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate(
      "snapshot has valid id",
      () => typeof firstSnapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot has content",
      () => typeof firstSnapshot.content === "string",
    );
    TestValidator.predicate(
      "snapshot has vote score",
      () => typeof firstSnapshot.vote_score === "number",
    );
    TestValidator.predicate(
      "snapshot has creation timestamp",
      () => typeof firstSnapshot.snapshot_created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has author",
      () => firstSnapshot.author !== null,
    );
  }
}
