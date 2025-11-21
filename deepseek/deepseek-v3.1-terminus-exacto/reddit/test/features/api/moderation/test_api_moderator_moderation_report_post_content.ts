import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderator submission of moderation reports for post content violations.
 *
 * This comprehensive E2E test validates the complete workflow of content
 * moderation reporting on a community platform. The test follows a realistic
 * business scenario where a moderator identifies inappropriate content and
 * submits a formal report.
 *
 * The workflow includes:
 *
 * 1. Moderator account creation and authentication
 * 2. Member account creation and authentication
 * 3. Community creation by the member
 * 4. Post creation within the community
 * 5. Moderator role switching and report submission
 * 6. Validation of the moderation report creation
 */
export async function test_api_moderator_moderation_report_post_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Member creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Switch to moderator context and submit moderation report
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Moderator submits report for the post
  const reportDescription = RandomGenerator.content({ paragraphs: 1 });
  const moderationReport =
    await api.functional.communityPlatform.moderator.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "post",
          target_id: post.id,
          description: reportDescription,
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Validation: Ensure report was created with correct data
  TestValidator.equals(
    "report ID should be valid UUID",
    moderationReport.id.length,
    36,
  );
  TestValidator.equals(
    "report type matches submitted type",
    moderationReport.report_type,
    "inappropriate_content",
  );
  TestValidator.equals(
    "report status should be initial state",
    moderationReport.status,
    "submitted",
  );
  TestValidator.equals(
    "priority level matches submitted value",
    moderationReport.priority_level,
    "medium",
  );
  TestValidator.equals(
    "report description matches submitted content",
    moderationReport.description,
    reportDescription,
  );
  TestValidator.predicate(
    "report creation timestamp should be set",
    moderationReport.created_at !== undefined &&
      moderationReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "target entity should be defined",
    moderationReport.target !== undefined,
  );
  TestValidator.equals(
    "target entity ID should match post ID",
    moderationReport.target.id,
    post.id,
  );
}
