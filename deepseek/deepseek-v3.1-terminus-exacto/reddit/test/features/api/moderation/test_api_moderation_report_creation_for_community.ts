import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderation report creation targeting a community entity
 *
 * This E2E test validates the complete workflow of creating a moderation report
 * for a community. It involves multiple actors: a member creates a community,
 * then an admin creates a moderation report targeting that community. The test
 * ensures proper relationship establishment between the moderation report and
 * the community entity, validating community-level reporting capabilities,
 * violation categorization, and escalation procedures.
 */
export async function test_api_moderation_report_creation_for_community(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for moderation reporting
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate("admin should have valid ID", admin.id.length > 0);
  TestValidator.predicate(
    "admin should have valid email",
    admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin should have valid display name",
    admin.display_name.length > 0,
  );
  TestValidator.predicate(
    "admin should have valid admin level",
    admin.admin_level.length > 0,
  );
  TestValidator.predicate(
    "admin should have valid token",
    admin.token.access.length > 0,
  );

  // Step 2: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: typia.random<string>(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member should have valid ID", member.id.length > 0);
  TestValidator.predicate(
    "member should have valid email",
    member.email.length > 0,
  );
  TestValidator.predicate(
    "member should have valid display name",
    member.display_name.length > 0,
  );
  TestValidator.predicate(
    "member should have valid token",
    member.token.access.length > 0,
  );

  // Step 3: Create a test community as the member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community should have valid ID",
    community.id.length > 0,
  );
  TestValidator.predicate(
    "community should have valid name",
    community.name.length > 0,
  );
  TestValidator.predicate(
    "community should have valid slug",
    community.slug.length > 0,
  );
  TestValidator.predicate(
    "community should have valid description",
    community.description.length > 0,
  );
  TestValidator.predicate(
    "community should have valid status",
    community.status.length > 0,
  );
  TestValidator.predicate(
    "community should have valid privacy",
    community.privacy.length > 0,
  );

  // Step 4: Switch to admin authentication
  const adminLogin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        ip: typia.random<string>(),
        href: "https://example.com/login",
        referrer: "https://example.com",
        session_id: typia.random<string & tags.Format<"uuid">>(),
        user_agent: "Test Browser",
      } satisfies ICommunityPlatformAdmin.ILogin,
    });
  typia.assert(adminLogin);
  TestValidator.predicate(
    "admin login should have valid ID",
    adminLogin.id.length > 0,
  );
  TestValidator.predicate(
    "admin login should have valid token",
    adminLogin.token.access.length > 0,
  );

  // Step 5: Create moderation report targeting the community
  const moderationReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.admin.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "community",
          target_id: community.id,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 6: Validate the report structure and relationships
  TestValidator.equals(
    "moderation report should have correct target type",
    moderationReport.target.name,
    community.name,
  );
  TestValidator.equals(
    "moderation report should reference correct community ID",
    moderationReport.target.id,
    community.id,
  );
  TestValidator.predicate(
    "moderation report should have a valid status",
    moderationReport.status.length > 0,
  );
  TestValidator.predicate(
    "moderation report should have a valid report type",
    moderationReport.report_type.length > 0,
  );
  TestValidator.predicate(
    "moderation report should have a valid priority level",
    moderationReport.priority_level.length > 0,
  );
  TestValidator.predicate(
    "moderation report should have a valid description",
    moderationReport.description.length > 0,
  );
  TestValidator.predicate(
    "moderation report should have a creation timestamp",
    moderationReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "moderation report should have an update timestamp",
    moderationReport.updated_at.length > 0,
  );
  TestValidator.predicate(
    "moderation report should have a valid confidence score",
    moderationReport.confidence_score >= 0 &&
      moderationReport.confidence_score <= 1,
  );
}
