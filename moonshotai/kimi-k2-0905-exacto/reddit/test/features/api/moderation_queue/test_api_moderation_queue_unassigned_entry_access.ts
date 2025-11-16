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
 * Test access to unassigned moderation queue entries by community moderators.
 * Validates that moderators can retrieve queue entries that are pending
 * assignment, review detailed report information, and understand the priority
 * assessment. Ensures complete visibility into queue status including reporter
 * context, violation categorization, and evidence evaluation requirements for
 * proper moderation decisions.
 */
export async function test_api_moderation_queue_unassigned_entry_access(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content reporting
  const reporterEmail = `reporter_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = "TestPassword123!";
  const reporterMemberBodyData = {
    nickname: `reporter_${RandomGenerator.alphaNumeric(6)}`,
    email: reporterEmail,
    password: memberPassword,
  } satisfies IRedditCommunityMember.ICreate;
  const reporter: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: reporterMemberBodyData,
    });
  typia.assert(reporter);
  TestValidator.equals(
    "reporter member created successfully",
    reporter.email,
    reporterEmail,
  );

  // Step 2: Create community moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorNickname = `moderator_${RandomGenerator.alphaNumeric(8)}`;
  const connectionHref = "https://reddit-community.local/login";
  const moderatorBodyData = {
    email: moderatorEmail,
    nickname: moderatorNickname,
    password: "ModeratorPass123!",
    href: connectionHref,
    referrer: connectionHref,
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorBodyData,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator member created successfully",
    moderator.email,
    moderatorEmail,
  );

  // Step 3: Create test community
  // Switch to member for community creation
  const memberLoginConnection = { ...connection };
  await api.functional.auth.member.login(memberLoginConnection, {
    body: {
      email: reporterEmail,
      password: memberPassword,
      href: connectionHref,
      referrer: connectionHref,
      ip: null,
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  const communityBodyData = {
    name: `test_community_${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
    title: "Test Community for Moderation Queue",
    description:
      "A test community for validating moderation queue access and functionality",
    category_name: "test_category",
    type: "public" as const,
    allow_crosspost: true,
  } satisfies IRedditCommunityCommunity.ICreate;
  const testCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(
      memberLoginConnection,
      {
        body: communityBodyData,
      },
    );
  typia.assert(testCommunity);
  TestValidator.equals(
    "test community created successfully",
    testCommunity.name,
    communityBodyData.name,
  );

  // Step 4: Create a post that can be reported
  const postTypes = ["text", "link"] as const;
  const postType = RandomGenerator.pick(postTypes);
  const postTitle = `Post for moderation testing: ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const postBodyData = {
    title: postTitle,
    content:
      postType === "text"
        ? RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          })
        : null,
    link_url:
      postType === "link"
        ? `https://example.com/test-${RandomGenerator.alphaNumeric(8)}`
        : null,
    reddit_community_id: testCommunity.id,
    reddit_post_type_id: (postType === "text"
      ? "00000000-0000-4000-9000-000000000001"
      : "00000000-0000-4000-9000-000000000002") as string & tags.Format<"uuid">,
  } satisfies IRedditCommunityPost.ICreate;
  const testPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(
      memberLoginConnection,
      {
        body: postBodyData,
      },
    );
  typia.assert(testPost);
  TestValidator.equals(
    "test post created successfully",
    testPost.title,
    postTitle,
  );

  // Step 5: Create content report to populate moderation queue
  const reportCategories = [
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
  ] as const;
  const reportCategory = RandomGenerator.pick(reportCategories);
  const reportReason = `Content violates community guidelines: ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })}`;

  const reportBodyData = {
    report_reason: reportReason,
    report_category: reportCategory,
    post_id: testPost.id,
    comment_id: null,
    content_type: "post" as const,
  } satisfies IRedditCommunityContentReport.ICreate;

  const contentReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      memberLoginConnection,
      {
        body: reportBodyData,
      },
    );
  typia.assert(contentReport);
  TestValidator.equals(
    "content report created successfully",
    contentReport.report_reason,
    reportReason,
  );

  // Step 6: Switch to moderator and access moderation queue entry
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: connectionHref,
      referrer: connectionHref,
      ip: null,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Access the moderation queue entry
  const moderationQueueEntry: IRedditCommunityModerationQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.at(
      connection,
      {
        queueId: contentReport.id, // Queue entry ID is same as report ID for unassigned entries
      },
    );
  typia.assert(moderationQueueEntry);

  // Step 7: Validate moderator access to queue entry information
  TestValidator.equals(
    "queue entry contains correct content report",
    moderationQueueEntry.content_report.id,
    contentReport.id,
  );
  TestValidator.equals(
    "queue entry shows correct report reason",
    moderationQueueEntry.content_report.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "queue entry shows correct report category",
    moderationQueueEntry.content_report.report_category,
    reportCategory,
  );
  TestValidator.equals(
    "queue entry shows correct content status",
    moderationQueueEntry.content_report.status,
    "submitted",
  );
  TestValidator.equals(
    "queue entry contains reporter information",
    moderationQueueEntry.content_report.reporter.id,
    reporter.id,
  );
  TestValidator.equals(
    "queue entry contains reported member information",
    moderationQueueEntry.content_report.reported_member.id,
    testPost.author.id,
  );
  TestValidator.equals(
    "queue entry contains reported post information",
    moderationQueueEntry.content_report.reported_post?.id,
    testPost.id,
  );
  TestValidator.equals(
    "queue entry shows correct content type",
    moderationQueueEntry.content_report.reported_post?.title,
    testPost.title,
  );

  // Validate queue status and assignment
  TestValidator.predicate(
    "queue entry should be unassigned (assignee is null)",
    moderationQueueEntry.assignee === null,
  );
  TestValidator.predicate(
    "queue entry should have pending status",
    moderationQueueEntry.status === "pending",
  );
  TestValidator.predicate(
    "queue entry should have new business status",
    moderationQueueEntry.business_status === "new",
  );
  TestValidator.predicate(
    "queue entry should have valid priority level",
    ["critical", "high", "medium", "low"].includes(
      moderationQueueEntry.priority,
    ),
  );
  TestValidator.equals(
    "queue entry should not have assignment timestamp",
    moderationQueueEntry.assigned_at,
    null,
  );
  TestValidator.equals(
    "queue entry should not have due date initially",
    moderationQueueEntry.due_date,
    null,
  );

  // Validate temporal tracking
  TestValidator.predicate(
    "queue entry should have creation timestamp",
    moderationQueueEntry.created_at !== null &&
      moderationQueueEntry.created_at !== undefined,
  );
  TestValidator.predicate(
    "queue entry should have update timestamp",
    moderationQueueEntry.updated_at !== null &&
      moderationQueueEntry.updated_at !== undefined,
  );

  // Validate content context completeness
  TestValidator.predicate(
    "queue entry should contain complete community context",
    moderationQueueEntry.content_report.reported_post?.community !== undefined,
  );
  TestValidator.equals(
    "queue entry should show correct community association",
    moderationQueueEntry.content_report.reported_post?.community.id,
    testCommunity.id,
  );
}
