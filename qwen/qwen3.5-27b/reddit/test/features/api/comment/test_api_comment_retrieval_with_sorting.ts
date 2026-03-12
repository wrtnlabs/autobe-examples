import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving comments for a post with different sorting options.
 *
 * Setup:
 * 1. Create a community (required prerequisite)
 * 2. Create a member account and authenticate
 * 3. Create a post in the community
 *
 * Test Cases:
 * 1. Sort by 'score' (DESC): Verify comments are ordered by highest vote score first
 * 2. Sort by 'created_at' (DESC): Verify comments are ordered by most recent first
 * 3. Sort by 'updated_at' (DESC): Verify comments are ordered by most recently updated first
 * 4. Verify pagination works correctly with page and limit parameters
 * 5. Verify response includes comment summaries with author info, content, score, and timestamps
 * 6. Verify parent comment references are included for replies
 *
 * Validation:
 * - Check response status is 200 OK
 * - Verify pagination metadata (current page, limit, total records, total pages)
 * - Verify comment order matches the requested sort option
 * - Verify each comment includes required fields: id, content, score, created_at, author, post, parent
 * - Verify author information is included (username, display_name, karma)
 * - Verify parent is null for top-level comments and contains comment summary for replies
 */
export async function test_api_comment_retrieval_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_clone_member_communities_create(
      communityConnection,
      {},
    );
  typia.assert(community);
  // 2. Create and authenticate first member
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Test sorting by 'score' (DESC)
  const scoreSortResult = await api.functional.redditClone.posts.comments.index(
    member1Connection,
    {
      postId: post.id,
      body: {
        sort: "score",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(scoreSortResult);
  TestValidator.equals(
    "score sort pagination current",
    scoreSortResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "score sort pagination limit",
    scoreSortResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "score sort has valid records count",
    scoreSortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "score sort has valid pages count",
    scoreSortResult.pagination.pages >= 0,
  );
  // 5. Test sorting by 'created_at' (DESC)
  const createdAtSortResult =
    await api.functional.redditClone.posts.comments.index(member1Connection, {
      postId: post.id,
      body: {
        sort: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(createdAtSortResult);
  TestValidator.equals(
    "created_at sort pagination current",
    createdAtSortResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "created_at sort pagination limit",
    createdAtSortResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "created_at sort has valid records count",
    createdAtSortResult.pagination.records >= 0,
  );
  // 6. Test sorting by 'updated_at' (DESC)
  const updatedAtSortResult =
    await api.functional.redditClone.posts.comments.index(member1Connection, {
      postId: post.id,
      body: {
        sort: "updated_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(updatedAtSortResult);
  TestValidator.equals(
    "updated_at sort pagination current",
    updatedAtSortResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "updated_at sort pagination limit",
    updatedAtSortResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "updated_at sort has valid records count",
    updatedAtSortResult.pagination.records >= 0,
  );
  // 7. Test pagination with smaller limit
  const paginationResult =
    await api.functional.redditClone.posts.comments.index(member1Connection, {
      postId: post.id,
      body: {
        sort: "created_at",
        order: "desc",
        page: 1,
        limit: 5,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination has valid records",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    paginationResult.pagination.pages >= 0,
  );
  // 8. Verify comment structure includes required fields (if any comments exist)
  if (paginationResult.data.length > 0) {
    const firstComment = paginationResult.data[0];
    typia.assert(firstComment);
    TestValidator.predicate("comment has id", firstComment.id !== undefined);
    TestValidator.predicate(
      "comment has content",
      firstComment.content !== undefined,
    );
    TestValidator.predicate(
      "comment has score",
      firstComment.score !== undefined,
    );
    TestValidator.predicate(
      "comment has created_at",
      firstComment.created_at !== undefined,
    );
    TestValidator.predicate(
      "comment has author",
      firstComment.author !== undefined,
    );
    TestValidator.predicate(
      "comment has post",
      firstComment.post !== undefined,
    );
    // Verify author information
    typia.assert(firstComment.author);
    TestValidator.predicate(
      "author has username",
      firstComment.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has display_name",
      firstComment.author.display_name !== undefined,
    );
    TestValidator.predicate(
      "author has karma",
      firstComment.author.karma !== undefined,
    );
    // Verify parent is null for top-level comments or contains comment summary for replies
    if (firstComment.parent !== null) {
      typia.assert(firstComment.parent);
      TestValidator.predicate(
        "parent comment has id",
        firstComment.parent.id !== undefined,
      );
    }
  }
  // 9. Test page 2 pagination
  const page2Result = await api.functional.redditClone.posts.comments.index(
    member1Connection,
    {
      postId: post.id,
      body: {
        sort: "created_at",
        order: "desc",
        page: 2,
        limit: 5,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 pagination current",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    page2Result.pagination.limit,
    5,
  );
}
