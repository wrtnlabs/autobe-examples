import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeContentReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_content_reports_moderation_queue_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorPassword = RandomGenerator.alphaNumeric(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community where moderator has moderation permissions
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create member accounts for posting and reporting
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create posts that will be reported
  const posts = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  });

  for (const post of posts) {
    typia.assert(post);
  }

  // Step 5: Create comments that will be reported
  const comments = await ArrayUtil.asyncRepeat(2, async () => {
    return await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: posts[0].id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  });

  for (const comment of comments) {
    typia.assert(comment);
  }

  // Step 6: Submit multiple content reports with different violation categories
  const reports: IRedditLikeContentReport[] = [];

  // Report first post with spam (5+ reports for high priority)
  for (let i = 0; i < 6; i++) {
    const report = await api.functional.redditLike.content_reports.create(
      connection,
      {
        body: {
          reported_post_id: posts[0].id,
          community_id: community.id,
          content_type: "post",
          violation_categories: "spam",
          additional_context: "This is spam content",
        } satisfies IRedditLikeContentReport.ICreate,
      },
    );
    typia.assert(report);
    reports.push(report);
  }

  // Report second post with harassment
  const report2 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: posts[1].id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "harassment",
        additional_context: "Harassment detected",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report2);
  reports.push(report2);

  // Report third post with hate speech
  const report3 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: posts[2].id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "hate speech",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report3);
  reports.push(report3);

  // Report comment with hate speech
  const report4 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: comments[0].id,
        community_id: community.id,
        content_type: "comment",
        violation_categories: "hate speech",
        additional_context: "Hate speech violation",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report4);
  reports.push(report4);

  // Step 7: Retrieve all reports as moderator (already authenticated)
  const allReports =
    await api.functional.redditLike.moderator.content_reports.index(
      connection,
      {
        body: {
          community_id: community.id,
          page: 1,
          limit: 20,
        } satisfies IRedditLikeContentReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.predicate(
    "moderator should see reports for their community",
    allReports.data.length > 0,
  );

  // Step 8: Test filtering by status (pending)
  const pendingReports =
    await api.functional.redditLike.moderator.content_reports.index(
      connection,
      {
        body: {
          status: "pending",
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeContentReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "pending reports should be retrieved",
    pendingReports.data.length > 0,
  );

  // Step 9: Test filtering by content type (post)
  const postReports =
    await api.functional.redditLike.moderator.content_reports.index(
      connection,
      {
        body: {
          content_type: "post",
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeContentReport.IRequest,
      },
    );
  typia.assert(postReports);
  TestValidator.predicate(
    "post reports should be retrieved",
    postReports.data.length > 0,
  );
  TestValidator.predicate(
    "all retrieved reports should be for posts",
    postReports.data.every((r) => r.content_type === "post"),
  );

  // Step 10: Test filtering by content type (comment)
  const commentReports =
    await api.functional.redditLike.moderator.content_reports.index(
      connection,
      {
        body: {
          content_type: "comment",
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeContentReport.IRequest,
      },
    );
  typia.assert(commentReports);
  TestValidator.predicate(
    "comment reports should be retrieved",
    commentReports.data.length > 0,
  );
  TestValidator.predicate(
    "all retrieved reports should be for comments",
    commentReports.data.every((r) => r.content_type === "comment"),
  );

  // Step 11: Test high-priority filtering (5+ reports)
  const highPriorityReports =
    await api.functional.redditLike.moderator.content_reports.index(
      connection,
      {
        body: {
          is_high_priority: true,
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeContentReport.IRequest,
      },
    );
  typia.assert(highPriorityReports);
  TestValidator.predicate(
    "high priority reports should be flagged for 5+ reports",
    highPriorityReports.data.length > 0,
  );
  TestValidator.predicate(
    "all high priority reports should have flag set",
    highPriorityReports.data.every((r) => r.is_high_priority === true),
  );

  // Step 12: Test pagination
  const paginatedReports =
    await api.functional.redditLike.moderator.content_reports.index(
      connection,
      {
        body: {
          community_id: community.id,
          page: 1,
          limit: 3,
        } satisfies IRedditLikeContentReport.IRequest,
      },
    );
  typia.assert(paginatedReports);
  TestValidator.predicate(
    "pagination should limit results to 3 or fewer",
    paginatedReports.data.length <= 3,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 3",
    paginatedReports.pagination.limit,
    3,
  );
}
