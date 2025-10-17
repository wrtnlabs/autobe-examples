import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalComment";

/**
 * Validate comment listing with parentCommentId filtering and edge-case
 * behavior.
 *
 * Scenario:
 *
 * 1. Register a test member (auth.member.join) to obtain authorization.
 * 2. Create a community and a text post under that community.
 * 3. Create a parent comment and two replies to it, plus an unrelated top-level
 *    comment under the same post.
 * 4. Create a second post and a comment there to produce a parentCommentId that
 *    belongs to a different post (used to assert 400 behavior).
 * 5. Call PATCH /communityPortal/posts/{postId}/comments with parentCommentId
 *    filtering and validate returned replies (only children of the parent),
 *    verify pagination metadata, and assert proper error behavior for mismatch
 *    and non-existent post.
 *
 * Note: The provided SDK does not include a delete-comment endpoint, so the
 * "deleted comments are excluded" check is documented but omitted from
 * execution. If deletion becomes available, add a follow-up test to mark a
 * comment deleted and assert exclusion.
 */
export async function test_api_post_comments_parent_filter_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register member
  const username = `user_${RandomGenerator.alphaNumeric(6)}`;
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "P@ssw0rd!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username,
      email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community
  const community =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: `test-community-${RandomGenerator.alphaNumeric(6)}`,
        // slug is optional; let server derive if it wishes
        description: "Integration test community",
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a text post in the community
  const post = await api.functional.communityPortal.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPortalPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create parent comment and replies
  const parentComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: null,
          body: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(parentComment);

  const replyA =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: parentComment.id,
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(replyA);

  const replyB =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: parentComment.id,
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(replyB);

  // Another top-level comment (should not appear when filtering by parent)
  const otherTopLevel =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: null,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(otherTopLevel);

  // 5. Create a second post and a comment there to use as a mismatched parent id
  const post2 = await api.functional.communityPortal.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPortalPost.ICreate,
    },
  );
  typia.assert(post2);

  const foreignComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post2.id,
        body: {
          post_id: post2.id,
          parent_comment_id: null,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(foreignComment);

  // 6A. Happy-path: fetch replies for parentComment using parentCommentId filter
  const listResponse =
    await api.functional.communityPortal.posts.comments.index(connection, {
      postId: post.id,
      body: {
        parentCommentId: parentComment.id,
        limit: 20,
        offset: 0,
        sort: "new",
      } satisfies ICommunityPortalComment.IRequest,
    });
  typia.assert(listResponse);

  // All returned items must reference the parentComment.id as their parent_comment_id
  TestValidator.predicate(
    "all returned comments reference the requested parentCommentId",
    listResponse.data.every(
      (c) =>
        c.parent_comment_id !== undefined &&
        c.parent_comment_id === parentComment.id,
    ),
  );

  // The unrelated top-level comment must not be included
  TestValidator.predicate(
    "unrelated top-level comment is not included in parent-filtered results",
    listResponse.data.every((c) => c.id !== otherTopLevel.id),
  );

  // Pagination metadata is coherent
  TestValidator.predicate(
    "pagination limit matches request",
    listResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is >= returned data length",
    listResponse.pagination.records >= listResponse.data.length,
  );

  // 6B. parentCommentId that belongs to a different post -> should throw (bad request)
  await TestValidator.error(
    "parentCommentId from another post should fail for this post",
    async () => {
      await api.functional.communityPortal.posts.comments.index(connection, {
        postId: post.id,
        body: {
          parentCommentId: foreignComment.id,
          limit: 10,
          offset: 0,
        } satisfies ICommunityPortalComment.IRequest,
      });
    },
  );

  // 6C. Non-existent postId should produce an error (not found)
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "requesting comments for non-existent postId should fail",
    async () => {
      await api.functional.communityPortal.posts.comments.index(connection, {
        postId: nonExistentPostId,
        body: {
          limit: 1,
          offset: 0,
        } satisfies ICommunityPortalComment.IRequest,
      });
    },
  );

  // Note: Deleted-comment exclusion test skipped because no delete endpoint
  // is present in the provided SDK. If deletion becomes available, add a
  // follow-up test that deletes a comment and asserts it no longer appears
  // in index() results when includeDeleted is false.
}
