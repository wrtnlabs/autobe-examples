import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeContentReport";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test platform administrator's unrestricted access to content reports across
 * all communities.
 *
 * Validates that platform administrators have platform-wide oversight
 * capability for content moderation. Creates multiple communities with
 * different moderators, generates content and reports in each community, then
 * verifies the administrator can retrieve and filter reports across all
 * communities without restriction.
 *
 * Steps:
 *
 * 1. Create moderator 1 and Community A
 * 2. Create moderator 2 and Community B
 * 3. Create members and generate content in both communities
 * 4. Submit content reports across both communities
 * 5. Create administrator account (which becomes the active session)
 * 6. Verify admin can retrieve all reports platform-wide
 * 7. Test filtering by specific community ID
 * 8. Test filtering by status across all communities
 * 9. Test filtering by content type platform-wide
 */
export async function test_api_content_reports_admin_platform_wide_access(
  connection: api.IConnection,
) {
  // Step 1: Create moderator 1 and Community A
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator1);

  const communityA = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityA);

  // Step 2: Create moderator 2 and Community B
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator2);

  const communityB = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "science",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityB);

  // Step 3: Create member accounts and generate content
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member1);

  // Create posts in both communities as member1
  const postA = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: communityA.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(postA);

  const postB = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: communityB.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(postB);

  // Create comments on posts
  const commentA = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: postA.id,
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(commentA);

  const commentB = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: postB.id,
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(commentB);

  // Step 4: Submit content reports across both communities
  const reportA1 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: postA.id,
        community_id: communityA.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: "This post contains inappropriate content",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(reportA1);

  const reportA2 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: commentA.id,
        community_id: communityA.id,
        content_type: "comment",
        violation_categories: "hate_speech",
        additional_context: "Offensive language in comment",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(reportA2);

  const reportB1 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: postB.id,
        community_id: communityB.id,
        content_type: "post",
        violation_categories: "violence",
        additional_context: "Contains violent imagery",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(reportB1);

  const reportB2 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: commentB.id,
        community_id: communityB.id,
        content_type: "comment",
        violation_categories: "spam",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(reportB2);

  // Step 5: Create administrator account (becomes the active authenticated session)
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 6: Retrieve all reports platform-wide as admin
  const allReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(allReports);

  TestValidator.predicate(
    "admin can retrieve reports from all communities",
    allReports.data.length >= 4,
  );

  // Verify reports from both communities are present
  const reportIds = allReports.data.map((r) => r.id);
  TestValidator.predicate(
    "reports from community A are accessible to admin",
    reportIds.includes(reportA1.id) || reportIds.includes(reportA2.id),
  );
  TestValidator.predicate(
    "reports from community B are accessible to admin",
    reportIds.includes(reportB1.id) || reportIds.includes(reportB2.id),
  );

  // Step 7: Test filtering by specific community ID
  const communityAReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
        community_id: communityA.id,
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(communityAReports);

  TestValidator.predicate(
    "admin can filter reports by community A",
    communityAReports.data.length >= 2,
  );

  const communityBReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
        community_id: communityB.id,
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(communityBReports);

  TestValidator.predicate(
    "admin can filter reports by community B",
    communityBReports.data.length >= 2,
  );

  // Step 8: Test filtering by status across all communities
  const pendingReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
        status: "pending",
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(pendingReports);

  TestValidator.predicate(
    "admin can filter pending reports across all communities",
    pendingReports.data.length >= 4,
  );

  // Step 9: Test filtering by content type platform-wide
  const postReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
        content_type: "post",
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(postReports);

  TestValidator.predicate(
    "admin can filter post reports across all communities",
    postReports.data.length >= 2,
  );

  const commentReports =
    await api.functional.redditLike.admin.content_reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
        content_type: "comment",
      } satisfies IRedditLikeContentReport.IRequest,
    });
  typia.assert(commentReports);

  TestValidator.predicate(
    "admin can filter comment reports across all communities",
    commentReports.data.length >= 2,
  );
}
