import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderator retrieval of moderation reports targeting comments within
 * community posts. Validates that moderators can access reports against comment
 * content, including threaded discussion context and comment-specific violation
 * details. Ensures comprehensive moderation workflow coverage for different
 * content types within community discussions.
 */
export async function test_api_moderation_report_moderator_comment_target(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account
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

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create post within community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create comment on post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 6: Submit moderation report against the comment
  const moderationReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "comment",
          target_id: comment.id,
          description: RandomGenerator.content({ paragraphs: 1 }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 7: Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Retrieve moderation report as moderator
  const retrievedReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.moderator.moderationReports.at(
      connection,
      {
        moderationReportId: moderationReport.id,
      },
    );
  typia.assert(retrievedReport);

  // Validate that the retrieved report matches the created report
  TestValidator.equals(
    "retrieved report ID matches created report",
    retrievedReport.id,
    moderationReport.id,
  );
  TestValidator.equals(
    "report type matches",
    retrievedReport.report_type,
    moderationReport.report_type,
  );
  TestValidator.equals(
    "report description matches",
    retrievedReport.description,
    moderationReport.description,
  );
  TestValidator.equals(
    "priority level matches",
    retrievedReport.priority_level,
    moderationReport.priority_level,
  );

  // Validate that the report target is properly associated with the comment
  TestValidator.equals(
    "report target ID matches comment ID",
    retrievedReport.target.id,
    comment.id,
  );

  // Validate report status and timestamps
  TestValidator.equals(
    "report status is submitted",
    retrievedReport.status,
    "submitted",
  );
  TestValidator.predicate(
    "report has creation timestamp",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "report has update timestamp",
    retrievedReport.updated_at !== null &&
      retrievedReport.updated_at !== undefined,
  );
}
