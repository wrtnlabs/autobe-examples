import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMember";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderator retrieval of moderation reports targeting specific users
 * within communities. This comprehensive E2E test validates the complete
 * workflow of user moderation reporting and moderator access. The test ensures
 * proper authentication flow switching between member and moderator roles,
 * validates the creation and retrieval of moderation reports, and confirms that
 * moderators can access user-targeted reports with complete context.
 */
export async function test_api_moderation_report_moderator_user_target(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
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

  // Step 2: Create member account that will submit the report
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create community for user membership context
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

  // Step 4: Add member to community as target for moderation report
  const communityMember =
    await api.functional.communityPlatform.member.communities.members.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          member: {
            id: member.id,
            email: member.email,
            display_name: member.display_name,
            karma_score: member.karma_score,
            is_verified: member.is_verified,
            last_active_at: member.last_active_at ?? new Date().toISOString(),
            created_at: member.created_at,
          } satisfies ICommunityPlatformMember.ISummary,
          role: "member",
          is_subscribed: true,
        } satisfies ICommunityPlatformCommunityMember.ICreate,
      },
    );
  typia.assert(communityMember);

  // Step 5: Submit moderation report against the community member
  const moderationReport =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: "harassment",
          target_type: "user",
          target_id: member.id,
          description: RandomGenerator.content({ paragraphs: 1 }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 6: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Retrieve moderation report using moderator API endpoint
  const retrievedReport =
    await api.functional.communityPlatform.moderator.moderationReports.at(
      connection,
      {
        moderationReportId: moderationReport.id,
      },
    );
  typia.assert(retrievedReport);

  // Step 8: Validate moderator can access the report details correctly
  TestValidator.equals(
    "report ID matches",
    retrievedReport.id,
    moderationReport.id,
  );
  TestValidator.equals(
    "report type matches",
    retrievedReport.report_type,
    "harassment",
  );
  TestValidator.equals(
    "report status is submitted",
    retrievedReport.status,
    "submitted",
  );
  TestValidator.equals(
    "priority level matches",
    retrievedReport.priority_level,
    "medium",
  );
  TestValidator.equals(
    "description matches",
    retrievedReport.description,
    moderationReport.description,
  );
  TestValidator.predicate(
    "target entity exists",
    retrievedReport.target !== undefined,
  );
  TestValidator.equals(
    "target entity ID matches",
    retrievedReport.target.id,
    member.id,
  );
}
