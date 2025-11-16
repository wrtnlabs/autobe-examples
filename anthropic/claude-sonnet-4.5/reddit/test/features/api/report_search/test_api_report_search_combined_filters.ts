import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test complex report search scenarios combining multiple filter parameters
 * simultaneously.
 *
 * This test validates that moderators can use multiple filters together for
 * precise report queue management. It creates various combinations of reports
 * (different statuses, categories, and content types) and verifies that
 * combined filters work correctly without conflicts.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator and create community
 * 2. Authenticate as member and create test content (posts and comments)
 * 3. Submit various reports with different combinations of status, category, and
 *    content type
 * 4. Switch back to moderator
 * 5. Test combined filter: status='pending' AND category='spam' AND
 *    content_type='post'
 * 6. Test combined filter: status='pending' AND category='harassment' AND
 *    content_type='comment'
 * 7. Test combined filter with sorting and pagination
 * 8. Verify all filters work together correctly
 */
export async function test_api_report_search_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create test posts
  const posts = await ArrayUtil.asyncRepeat(5, async () => {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 5: Create test comments
  const comments = await ArrayUtil.asyncRepeat(5, async (index) => {
    const comment =
      await api.functional.redditCommunity.member.posts.comments.create(
        connection,
        {
          postId: posts[index % posts.length].id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            parent_comment_id: null,
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });

  // Step 6: Submit various reports with different combinations
  // Create pending spam post reports
  const pendingSpamPostReports = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const report = await api.functional.redditCommunity.member.reports.create(
        connection,
        {
          body: {
            content_type: "post" as const,
            target_content_id: posts[index].id,
            reddit_community_community_id: community.id,
            category: "spam" as const,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditCommunityReport.ICreate,
        },
      );
      typia.assert(report);
      return report;
    },
  );

  // Create pending harassment comment reports
  const pendingHarassmentCommentReports = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const report = await api.functional.redditCommunity.member.reports.create(
        connection,
        {
          body: {
            content_type: "comment" as const,
            target_content_id: comments[index].id,
            reddit_community_community_id: community.id,
            category: "harassment" as const,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditCommunityReport.ICreate,
        },
      );
      typia.assert(report);
      return report;
    },
  );

  // Create pending misinformation post reports
  const pendingMisinfoPostReports = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const report = await api.functional.redditCommunity.member.reports.create(
        connection,
        {
          body: {
            content_type: "post" as const,
            target_content_id: posts[index + 3].id,
            reddit_community_community_id: community.id,
            category: "misinformation" as const,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditCommunityReport.ICreate,
        },
      );
      typia.assert(report);
      return report;
    },
  );

  // Create other category comment reports
  const otherCommentReports = await ArrayUtil.asyncRepeat(1, async (index) => {
    const report = await api.functional.redditCommunity.member.reports.create(
      connection,
      {
        body: {
          content_type: "comment" as const,
          target_content_id: comments[index + 2].id,
          reddit_community_community_id: community.id,
          category: "other" as const,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Step 7: Switch back to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 8: Test combined filter - status='pending' AND category='spam' AND content_type='post'
  const pendingSpamPosts =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        status: "pending" as const,
        category: "spam",
        content_type: "post" as const,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(pendingSpamPosts);

  // Verify only pending spam post reports appear
  TestValidator.equals(
    "pending spam post reports count",
    pendingSpamPosts.data.length,
    pendingSpamPostReports.length,
  );

  for (const report of pendingSpamPosts.data) {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals("report category is spam", report.category, "spam");
    TestValidator.equals(
      "report content_type is post",
      report.content_type,
      "post",
    );
  }

  // Step 9: Test combined filter - status='pending' AND category='harassment' AND content_type='comment'
  const pendingHarassmentComments =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        status: "pending" as const,
        category: "harassment",
        content_type: "comment" as const,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(pendingHarassmentComments);

  // Verify only pending harassment comment reports appear
  TestValidator.equals(
    "pending harassment comment reports count",
    pendingHarassmentComments.data.length,
    pendingHarassmentCommentReports.length,
  );

  for (const report of pendingHarassmentComments.data) {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals(
      "report category is harassment",
      report.category,
      "harassment",
    );
    TestValidator.equals(
      "report content_type is comment",
      report.content_type,
      "comment",
    );
  }

  // Step 10: Test combined filter with sorting and pagination - category='spam' AND sort_by='created_at' AND sort_order='desc' AND limit=5
  const sortedSpamReports =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        category: "spam",
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
        page: 1,
        limit: 2,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(sortedSpamReports);

  // Verify filtered, sorted, and paginated results
  TestValidator.predicate(
    "sorted spam reports respect limit",
    sortedSpamReports.data.length <= 2,
  );

  for (const report of sortedSpamReports.data) {
    TestValidator.equals("report category is spam", report.category, "spam");
  }

  // Verify descending order by created_at
  if (sortedSpamReports.data.length >= 2) {
    const first = new Date(sortedSpamReports.data[0].created_at).getTime();
    const second = new Date(sortedSpamReports.data[1].created_at).getTime();
    TestValidator.predicate(
      "reports sorted by created_at descending",
      first >= second,
    );
  }

  // Step 11: Test all pending reports regardless of category or content type
  const allPendingReports =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        status: "pending" as const,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(allPendingReports);

  // Verify all pending reports are returned
  const totalPendingCount =
    pendingSpamPostReports.length +
    pendingHarassmentCommentReports.length +
    pendingMisinfoPostReports.length +
    otherCommentReports.length;

  TestValidator.equals(
    "total pending reports count",
    allPendingReports.data.length,
    totalPendingCount,
  );

  // Verify all returned reports have pending status
  for (const report of allPendingReports.data) {
    TestValidator.equals(
      "all reports have pending status",
      report.status,
      "pending",
    );
  }
}
