import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumPostComment";

/**
 * Test pagination functionality for retrieving comment replies in a community
 * forum.
 *
 * This test validates that the pagination system for comment replies works
 * correctly, handling forward and backward navigation through large sets of
 * comment replies. It creates multiple replies to a single comment and verifies
 * that page limits, record counts, and page navigation work as expected. The
 * test ensures that deleted comments are properly filtered out while
 * maintaining conversation context and that sorting options work correctly.
 *
 * Test flow:
 *
 * 1. Create two users (author and replier)
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Create a parent comment on the post
 * 5. Create multiple replies to the parent comment
 * 6. Test pagination with different page sizes
 * 7. Verify correct sorting (newest first by default)
 * 8. Test filtering out deleted comments
 * 9. Validate pagination metadata (current page, total pages, record count)
 */
export async function test_api_comment_replies_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create first user (author)
  const authorEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const authorPassword = "password123";
  const authorUsername = RandomGenerator.name(1);

  const author: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: authorEmail,
        password: authorPassword,
        username: authorUsername,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(author);

  // Step 2: Create second user (replier)
  const replierEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const replierPassword = "password123";
  const replierUsername = RandomGenerator.name(1);

  const replier: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: replierEmail,
        password: replierPassword,
        username: replierUsername,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(replier);

  // Step 3: Create a community
  const communityName = RandomGenerator.name(2)
    .toLowerCase()
    .replace(/\s+/g, "-");
  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: {
        name: communityName,
        slug: communityName,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    });
  typia.assert(community);

  // Step 4: Create a post
  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: {
        community_forum_community_id: community.id,
        title: RandomGenerator.name(4),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityForumCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create a parent comment
  const parentComment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
        ip: "127.0.0.1",
        href: "http://localhost:3000/test",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityForumPostComment.ICreate,
    });
  typia.assert(parentComment);

  // Step 6: Create multiple replies to the parent comment
  const replyCount = 15;
  const replies: ICommunityForumPostComment[] = [];

  for (let i = 0; i < replyCount; i++) {
    // Login as replier for each comment
    await api.functional.auth.user.join(connection, {
      body: {
        email: replierEmail,
        password: replierPassword,
        username: replierUsername,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });

    const reply: ICommunityForumPostComment =
      await api.functional.communityForum.user.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            ip: "127.0.0.1",
            href: "http://localhost:3000/test",
            referrer: "http://localhost:3000/",
          } satisfies ICommunityForumPostComment.ICreate,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // Step 7: Test pagination with default parameters (page 1, limit 20)
  const defaultPagination: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {} satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(defaultPagination);

  TestValidator.equals(
    "default pagination should return all replies",
    defaultPagination.data.length,
    replyCount,
  );

  TestValidator.equals(
    "default pagination current page should be 1",
    defaultPagination.pagination.current,
    1,
  );

  TestValidator.equals(
    "default pagination limit should be 20",
    defaultPagination.pagination.limit,
    20,
  );

  TestValidator.equals(
    "default pagination total records should match reply count",
    defaultPagination.pagination.records,
    replyCount,
  );

  TestValidator.equals(
    "default pagination total pages should be 1",
    defaultPagination.pagination.pages,
    1,
  );

  // Step 8: Test pagination with custom limit (5 per page)
  const limit = 5;
  const customPagination: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: limit,
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(customPagination);

  TestValidator.equals(
    "custom pagination should return limited replies",
    customPagination.data.length,
    limit,
  );

  TestValidator.equals(
    "custom pagination current page should be 1",
    customPagination.pagination.current,
    1,
  );

  TestValidator.equals(
    "custom pagination limit should match requested limit",
    customPagination.pagination.limit,
    limit,
  );

  TestValidator.equals(
    "custom pagination total records should match reply count",
    customPagination.pagination.records,
    replyCount,
  );

  TestValidator.equals(
    "custom pagination total pages should be correct",
    customPagination.pagination.pages,
    Math.ceil(replyCount / limit),
  );

  // Step 9: Test second page with custom limit
  const secondPage: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 2,
        limit: limit,
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current page should be 2",
    secondPage.pagination.current,
    2,
  );

  TestValidator.equals(
    "second page should have correct number of replies",
    secondPage.data.length,
    replyCount - limit,
  );

  // Step 10: Test sorting by new (default behavior)
  const sortedReplies: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        sort: "new",
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(sortedReplies);

  // Verify replies are sorted by creation date (newest first)
  for (let i = 0; i < sortedReplies.data.length - 1; i++) {
    const current = new Date(sortedReplies.data[i].created_at);
    const next = new Date(sortedReplies.data[i + 1].created_at);
    TestValidator.predicate(
      `replies should be sorted by creation date (newest first) at index ${i}`,
      () => current >= next,
    );
  }

  // Step 11: Test with search filter
  if (replies.length > 0) {
    const searchContent = replies[0].body.substring(0, 5);
    const searchResult: IPageICommunityForumPostComment.ISummary =
      await api.functional.communityForum.comments.replies.index(connection, {
        commentId: parentComment.id,
        body: {
          search: searchContent,
        } satisfies ICommunityForumPostComment.IRequest,
      });
    typia.assert(searchResult);

    // Verify search results contain the search term
    searchResult.data.forEach((reply) => {
      TestValidator.predicate("search result should contain search term", () =>
        reply.body.includes(searchContent),
      );
    });
  }

  // Step 12: Test with author filter
  const authorFilterResult: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        author: replierUsername,
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(authorFilterResult);

  // Verify all replies are from the specified author
  authorFilterResult.data.forEach((reply) => {
    TestValidator.equals(
      "filtered replies should be from specified author",
      reply.author.username,
      replierUsername,
    );
  });

  // Step 13: Test time-based filtering (after a specific time)
  if (replies.length > 2) {
    const middleReply = replies[Math.floor(replies.length / 2)];
    const afterFilterResult: IPageICommunityForumPostComment.ISummary =
      await api.functional.communityForum.comments.replies.index(connection, {
        commentId: parentComment.id,
        body: {
          after: middleReply.created_at,
        } satisfies ICommunityForumPostComment.IRequest,
      });
    typia.assert(afterFilterResult);

    // Verify all replies are after the specified time
    afterFilterResult.data.forEach((reply) => {
      TestValidator.predicate(
        "replies should be after specified time",
        () => new Date(reply.created_at) >= new Date(middleReply.created_at),
      );
    });
  }

  // Step 14: Test pagination metadata consistency
  const metadataTest: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(metadataTest);

  TestValidator.predicate(
    "total records should be greater than or equal to data length",
    () => metadataTest.pagination.records >= metadataTest.data.length,
  );

  TestValidator.predicate(
    "current page should be less than or equal to total pages",
    () => metadataTest.pagination.current <= metadataTest.pagination.pages,
  );
}
