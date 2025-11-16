import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test retrieving a member suspension with permanent duration (expires_at is
 * null).
 *
 * This test validates that permanent suspensions (with null expires_at) can be
 * correctly created and retrieved from the system. It verifies that the API
 * properly preserves null expiration times and returns complete suspension
 * details.
 *
 * Workflow:
 *
 * 1. Create administrator account for system access
 * 2. Create category for community classification
 * 3. Create member account to be suspended
 * 4. Create community as moderation context
 * 5. Create moderator account for decision authority
 * 6. Create report decision with suspend_user action
 * 7. Create permanent suspension (expires_at: null)
 * 8. Retrieve the suspension and validate null expiration is preserved
 */
export async function test_api_member_suspension_retrieval_permanent_suspension(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `test-${RandomGenerator.alphaNumeric(5)}`,
          description: RandomGenerator.paragraph(),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community as context for moderation
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `comm-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 6. Create report decision with suspend_user action
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "suspend_user",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
          suspension_duration_days: 30,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 7. Create permanent suspension (expires_at: null)
  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: RandomGenerator.paragraph({ sentences: 3 }),
          suspended_at: new Date().toISOString(),
          expires_at: null,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // 8. Retrieve the suspension and validate permanent expiration (null expires_at)
  const retrievedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.at(
      connection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(retrievedSuspension);

  // Validate the retrieved suspension has null expires_at indicating permanent suspension
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    suspension.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedSuspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "expires_at is null for permanent suspension",
    retrievedSuspension.expires_at,
    null,
  );
  TestValidator.predicate(
    "suspended_at is present",
    retrievedSuspension.suspended_at !== null &&
      retrievedSuspension.suspended_at !== undefined,
  );
  TestValidator.predicate(
    "suspension reason is preserved",
    retrievedSuspension.suspension_reason.length >= 20,
  );
}
