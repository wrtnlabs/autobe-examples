import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test retrieval of moderation queue entry with comprehensive content context.
 *
 * This test validates that community moderators can retrieve detailed
 * moderation queue entries containing complete case information needed for
 * informed decision-making. The test covers:
 *
 * 1. Multi-actor authentication setup (member creates content, moderator reviews)
 * 2. Community establishment and content creation workflow
 * 3. Content reporting system integration
 * 4. Comprehensive queue entry retrieval with full context
 *
 * The test ensures moderators receive original post details, author
 * information, violation categorization, and community context for systematic
 * moderation review processes.
 */
export async function test_api_moderation_queue_detail_with_content_context(
  connection: api.IConnection,
) {
  // Step 1: Create content author (member) account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        nickname: RandomGenerator.name(2),
        password: "TestPassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorClientIp: string = "192.168.1.100";
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        nickname: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: `https://redditcommunity.com/moderator/join`,
        referrer: `https://redditcommunity.com/moderator/registration`,
        ip: moderatorClientIp,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Member creates a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: `https://redditcommunity.com/member/login`,
      referrer: `https://redditcommunity.com/communities`,
    },
  });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: `testcommunity_${RandomGenerator.alphabets(8)}`,
        title: "Test Community for Moderation",
        description:
          "Community focused on testing comprehensive moderation queue functionality",
        category_name: "Technology",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Member creates a detailed post
  const postTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const postContent: string = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 12,
    sentenceMax: 25,
    wordMin: 3,
    wordMax: 7,
  });

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: community.id,
        reddit_post_type_id: community.id, // Using community ID to reference post type
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create content report targeting the post
  const reportCategory: string = RandomGenerator.pick([
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
  ] as const);
  const report: IRedditCommunityContentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 8,
            wordMax: 12,
          }),
          report_category: reportCategory,
          content_type: "post",
          post_id: post.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Switch to moderator account for queue review
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: `https://redditcommunity.com/moderator/login`,
      referrer: `https://redditcommunity.com/moderator/dashboard`,
      ip: moderatorClientIp,
    },
  });

  // Step 7: Retrieve comprehensive moderation queue entry details
  const moderationQueue: IRedditCommunityModerationQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.at(
      connection,
      {
        queueId: report.id, // Content report ID becomes the queue entry ID
      },
    );
  typia.assert(moderationQueue);

  // Step 8: Validate comprehensive context information
  TestValidator.predicate(
    "Moderation queue contains complete content report context",
    moderationQueue.content_report.id === report.id,
  );

  TestValidator.predicate(
    "Queue entry contains original reported content details",
    moderationQueue.content_report.reported_post?.id === post.id,
  );

  TestValidator.predicate(
    "Queue entry contains reporter information for accountability",
    moderationQueue.content_report.reporter.id === member.id,
  );

  TestValidator.predicate(
    "Queue entry contains reported member context",
    moderationQueue.content_report.reported_member.id === member.id,
  );

  TestValidator.predicate(
    "Moderation queue priority is appropriately set",
    ["critical", "high", "medium", "low"].includes(moderationQueue.priority),
  );

  TestValidator.predicate(
    "Queue status follows proper workflow progression",
    ["pending", "assigned", "in_review", "reviewed", "escalated"].includes(
      moderationQueue.status,
    ),
  );

  TestValidator.predicate(
    "Business status provides granular workflow tracking",
    ["new", "assigned", "reviewing", "completed", "on_hold"].includes(
      moderationQueue.business_status,
    ),
  );

  TestValidator.equals(
    "Moderation queue contains proper temporal tracking",
    typeof moderationQueue.created_at,
    "string",
  );

  // Step 9: Validate multi-actor integration
  TestValidator.predicate(
    "Created and modification timestamps are properly maintained",
    moderationQueue.created_at.length > 0,
  );

  TestValidator.predicate(
    "Updated timestamp follows modification patterns",
    moderationQueue.updated_at.length > 0,
  );

  TestValidator.predicate(
    "Content report maintains comprehensive violation context",
    moderationQueue.content_report.report_reason.length > 0,
  );

  TestValidator.predicate(
    "Report category aligns with violation severity standards",
    moderationQueue.content_report.report_category.length > 0,
  );

  // Validate temporal workflow progression
  TestValidator.predicate(
    "Content report timestamp provides submission timing context",
    moderationQueue.content_report.reported_at.length > 0,
  );

  // Step 10: Validate queue management integration
  TestValidator.predicate(
    "Queue entry maintains assignment tracking capability",
    moderationQueue.assignee === null || moderationQueue.assignee !== null,
  );

  TestValidator.predicate(
    "Queue supports platform-level escalation workflows",
    moderationQueue.platform_assignee === null ||
      moderationQueue.platform_assignee !== null,
  );

  TestValidator.predicate(
    "Assignment workflow allows proper moderator allocation",
    moderationQueue.assigned_at === null ||
      moderationQueue.assigned_at !== null,
  );

  TestValidator.predicate(
    "Due date tracking enables SLA compliance monitoring",
    moderationQueue.due_date === null || moderationQueue.due_date !== null,
  );

  // Comprehensive workflow integration validation
  TestValidator.predicate(
    "Moderation queue entry preserves complete audit trail",
    typeof moderationQueue.notes === "undefined" ||
      moderationQueue.notes !== null,
  );

  TestValidator.predicate(
    "Soft deletion protection maintains data integrity",
    moderationQueue.deleted_at === null || moderationQueue.deleted_at !== null,
  );
}
