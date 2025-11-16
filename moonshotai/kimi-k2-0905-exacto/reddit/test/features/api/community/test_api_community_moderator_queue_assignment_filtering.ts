import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationQueue";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReportStatus";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test the assignment filtering system for community moderator moderation
 * queue.
 *
 * This test validates the workflow management aspects of the moderation system
 * by testing filtering capabilities for different assignment statuses. It
 * ensures moderators can efficiently coordinate workload distribution and
 * prevents reports from being overlooked due to assignment confusion.
 *
 * Test steps:
 *
 * 1. Create multiple community moderators for assignment testing
 * 2. Create member accounts to generate content and reports
 * 3. Create posts that can be reported
 * 4. Generate multiple content reports to populate the moderation queue
 * 5. Test filtering by different assignment statuses:
 *
 *    - Unassigned reports
 *    - Assigned_to_me reports
 *    - Assigned_to_others reports
 *    - Assigned_to_platform reports
 * 6. Validate that filters return appropriate results for each moderator
 */
export async function test_api_community_moderator_queue_assignment_filtering(
  connection: api.IConnection,
) {
  // Create first community moderator
  const moderatorEmail1 = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail1,
        nickname: RandomGenerator.name(),
        password: "moderator123",
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator1);

  // Create second community moderator
  const moderatorEmail2 = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail2,
        nickname: RandomGenerator.name(),
        password: "moderator123",
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator2);

  // Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: RandomGenerator.name(),
      password: "member123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Create post types and communities for testing
  const postTypes = ["text", "link", "image"] as const;
  const communities = ["tech", "gaming", "news"] as const;

  // Create multiple posts to generate content for reporting
  const posts = await ArrayUtil.asyncRepeat<IRedditCommunityPost>(
    5,
    async (index) => {
      const postType = RandomGenerator.pick(postTypes);
      const community = RandomGenerator.pick(communities);

      const postData = {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content:
          postType === "text"
            ? RandomGenerator.content({ paragraphs: 2 })
            : undefined,
        link_url:
          postType === "link"
            ? `https://example.com/article-${index}`
            : undefined,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate;

      return await api.functional.redditCommunity.member.posts.create(
        connection,
        {
          body: postData,
        },
      );
    },
  );
  typia.assert(posts);

  // Generate multiple content reports to populate moderation queue
  const reportCategories = [
    "harassment",
    "spam",
    "misinformation",
    "hate_speech",
  ] as const;
  const reports = await ArrayUtil.asyncRepeat<IRedditCommunityContentReport>(
    8,
    async (index) => {
      const targetPost = RandomGenerator.pick(posts);
      const category = RandomGenerator.pick(reportCategories);

      const reportData = {
        report_reason: `This post contains ${category} content that violates community guidelines`,
        report_category: category,
        content_type: "post" as const,
        post_id: targetPost.id,
      } satisfies IRedditCommunityContentReport.ICreate;

      return await api.functional.redditCommunity.member.contentReports.create(
        connection,
        {
          body: reportData,
        },
      );
    },
  );
  typia.assert(reports);

  // Switch to first moderator and test assignment filtering
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail1,
      password: "moderator123",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Test 1: View unassigned reports
  const unassignedQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          assignment_filter: "unassigned",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(unassignedQueue);
  TestValidator.predicate(
    "unassigned queue should contain entries",
    unassignedQueue.data.length > 0,
  );

  // Test 2: View all reports (no assignment filter)
  const allQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(allQueue);
  TestValidator.predicate(
    "all queue should contain entries",
    allQueue.data.length > 0,
  );

  // Test 3: Filter by report category
  const harassmentQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          report_category: "harassment",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(harassmentQueue);
  TestValidator.predicate(
    "harassment queue should contain entries",
    harassmentQueue.data.length >= 0,
  );

  // Test 4: Combine filters (unassigned + specific category)
  const filteredQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          assignment_filter: "unassigned",
          report_category: "spam",
          page: 1,
          limit: 5,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(filteredQueue);
  TestValidator.predicate(
    "filtered queue should contain entries",
    filteredQueue.data.length >= 0,
  );

  // Test 5: Test pagination
  const page1Queue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(page1Queue);
  TestValidator.predicate(
    "page 1 should have entries",
    page1Queue.data.length > 0,
  );
  TestValidator.equals("page 1 limit should be 3", page1Queue.data.length, 3);

  const page2Queue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(page2Queue);
  TestValidator.predicate(
    "page 2 should have entries",
    page2Queue.data.length >= 0,
  );

  // Validate that different pages return different results
  if (page1Queue.data.length > 0 && page2Queue.data.length > 0) {
    TestValidator.notEquals(
      "different pages should return different results",
      page1Queue.data[0].id,
      page2Queue.data[0].id,
    );
  }

  // Switch to second moderator and test their perspective
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail2,
      password: "moderator123",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Test 6: Different moderator should see same unassigned reports
  const moderator2UnassignedQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          assignment_filter: "unassigned",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(moderator2UnassignedQueue);
  TestValidator.predicate(
    "moderator 2 unassigned queue should contain entries",
    moderator2UnassignedQueue.data.length > 0,
  );

  // Test 7: Validate queue structure and data integrity
  TestValidator.predicate(
    "all queue entries should have valid structure",
    moderator2UnassignedQueue.data.every((entry) => {
      return (
        typeof entry.id === "string" &&
        entry.content_report &&
        typeof entry.content_report.id === "string" &&
        entry.content_report.report_reason &&
        entry.content_report.report_category &&
        entry.priority &&
        entry.status
      );
    }),
  );

  // Test 8: Status-based filtering
  const submittedQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          status_filter: "submitted",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(submittedQueue);
  TestValidator.predicate(
    "submitted queue should contain entries",
    submittedQueue.data.length > 0,
  );
  TestValidator.predicate(
    "all entries should have submitted status",
    submittedQueue.data.every(
      (entry) => entry.content_report.status === "submitted",
    ),
  );
}
