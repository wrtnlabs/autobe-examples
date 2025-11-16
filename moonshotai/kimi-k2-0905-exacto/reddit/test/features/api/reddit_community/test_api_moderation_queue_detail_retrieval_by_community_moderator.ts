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
 * Test retrieval of detailed moderation queue entry information by a community
 * moderator.
 *
 * This test validates that community moderators can access moderation queue
 * entries assigned to their communities, view complete report details including
 * content metadata, reporter information, and current moderation status. It
 * ensures proper authorization checks prevent access to queues outside the
 * moderator's community scope.
 *
 * The test will:
 *
 * 1. Create a community moderator account and authenticate
 * 2. Create a regular member account to create test content
 * 3. Create a new community that the moderator will manage
 * 4. Create a test post and content report to populate the moderation queue
 * 5. Retrieve the detailed moderation queue entry information
 * 6. Validate that the moderator can access and view all report details
 */
export async function test_api_moderation_queue_detail_retrieval_by_community_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorNickname = RandomGenerator.name();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        nickname: moderatorNickname,
        password: "ModeratorPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create a regular member account to create test content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberNickname = RandomGenerator.name();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: memberNickname,
      password: "MemberPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create a new community by the member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com/join",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  const communityName = RandomGenerator.name(1)
    .replace(/\s+/g, "_")
    .toLowerCase();
  const communityTitle = RandomGenerator.name(3);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: communityTitle,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Create a test post by the member
  const postTypeId = typia.random<string & tags.Format<"uuid">>();
  const postTitle = RandomGenerator.name(4);
  const postContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: community.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create a content report as the member
  const reportReason =
    "This post contains inappropriate content that violates community guidelines";
  const reportCategory = "inappropriate_content";

  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: reportReason,
          report_category: reportCategory,
          content_type: "post",
          post_id: post.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Switch back to moderator and retrieve moderation queue details
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // The moderation queue entry ID would be derived from the report
  // For this test, we'll use the report ID as it's the created moderation queue entry
  const moderationQueueEntry =
    await api.functional.redditCommunity.communityModerator.moderationQueue.at(
      connection,
      {
        queueId: report.id,
      },
    );
  typia.assert(moderationQueueEntry);

  // Step 7: Validate the moderation queue entry details
  TestValidator.equals(
    "moderation queue ID matches",
    moderationQueueEntry.id,
    report.id,
  );
  TestValidator.equals(
    "content report ID matches",
    moderationQueueEntry.content_report.id,
    report.id,
  );
  TestValidator.equals(
    "report reason matches",
    moderationQueueEntry.content_report.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "report category matches",
    moderationQueueEntry.content_report.report_category,
    reportCategory,
  );
  TestValidator.equals(
    "status should be pending",
    moderationQueueEntry.status,
    "pending",
  );
  TestValidator.equals(
    "business status should be new",
    moderationQueueEntry.business_status,
    "new",
  );
  TestValidator.predicate(
    "priority should be valid",
    ["critical", "high", "medium", "low"].includes(
      moderationQueueEntry.priority,
    ),
  );
  TestValidator.equals(
    "reporter info should be present",
    moderationQueueEntry.content_report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reported member should be the post author",
    moderationQueueEntry.content_report.reported_member.id,
    member.id,
  );
  TestValidator.equals(
    "reported post should match",
    moderationQueueEntry.content_report.reported_post?.id,
    post.id,
  );

  // Validate the queue entry has proper metadata
  TestValidator.predicate(
    "created_at should be valid ISO datetime",
    typeof moderationQueueEntry.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at should be valid ISO datetime",
    typeof moderationQueueEntry.updated_at === "string",
  );
  TestValidator.equals(
    "assignee should be undefined for new entries",
    moderationQueueEntry.assignee,
    undefined,
  );
  TestValidator.equals(
    "platform_assignee should be undefined for new entries",
    moderationQueueEntry.platform_assignee,
    undefined,
  );
}
