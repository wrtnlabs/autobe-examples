import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Test comment search functionality with status-based filtering to validate
 * moderation workflow integration. Create published comments and verify that
 * the search operation correctly filters results based on the specified status
 * parameter. Validate that regular users can only search for published
 * comments.
 */
export async function test_api_post_comments_search_with_status_filter(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a post to contain comments
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 3. Create multiple published comments
  const commentCount = 3;
  const createdComments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            body: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
            community_platform_post_id: post.id,
            // Regular members can only create published comments
            status: "published",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // 4. Test search functionality with published status filter
  const publishedResults: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(publishedResults);

  // Verify all created comments are returned
  TestValidator.equals(
    "all published comments should be found in results",
    createdComments.every((comment) =>
      publishedResults.data.some((result) => result.id === comment.id),
    ),
    true,
  );

  // Verify only comments for this post are returned
  TestValidator.equals(
    "results should only contain comments for the target post",
    publishedResults.data.every((result) => result.post.id === post.id),
    true,
  );

  // Test with no status filter (should default to published only)
  const defaultResults: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(defaultResults);

  // Verify default results match published results
  TestValidator.equals(
    "default search should return same results as published filter",
    defaultResults.data.length,
    publishedResults.data.length,
  );

  // Verify pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    publishedResults.pagination.current === 1 &&
      publishedResults.pagination.limit === 10 &&
      publishedResults.pagination.records >= commentCount &&
      publishedResults.pagination.pages >= 1,
  );

  // Verify comment summary structure for each returned comment
  for (const commentSummary of publishedResults.data) {
    TestValidator.predicate(
      "comment summary should have valid id",
      typeof commentSummary.id === "string" && commentSummary.id.length > 0,
    );
    TestValidator.predicate(
      "comment summary should have valid body",
      typeof commentSummary.body === "string" && commentSummary.body.length > 0,
    );
    TestValidator.predicate(
      "comment summary should have published status",
      commentSummary.status === "published",
    );
    TestValidator.predicate(
      "comment summary should have valid score",
      typeof commentSummary.score === "number" && commentSummary.score >= 0,
    );
    TestValidator.predicate(
      "comment summary should have valid reply count",
      typeof commentSummary.reply_count === "number" &&
        commentSummary.reply_count >= 0,
    );
    TestValidator.predicate(
      "comment summary should have valid timestamps",
      typeof commentSummary.created_at === "string" &&
        commentSummary.created_at.length > 0 &&
        typeof commentSummary.updated_at === "string" &&
        commentSummary.updated_at.length > 0,
    );
    TestValidator.predicate(
      "comment summary should have valid post reference",
      typeof commentSummary.post === "object" &&
        typeof commentSummary.post.id === "string" &&
        commentSummary.post.id === post.id,
    );
  }

  // Test error case with invalid status
  await TestValidator.error("should reject invalid status value", async () => {
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        status: "invalid_status" as any,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  });
}
