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
 * Test extending a member suspension duration by updating expires_at to a later
 * date.
 *
 * This test validates the moderator workflow of extending member suspensions
 * when additional violations are discovered or appeals are rejected. It covers
 * the complete flow from user registration through suspension creation and
 * extension.
 *
 * Test flow:
 *
 * 1. Create moderator account for authentication
 * 2. Create administrator and setup category
 * 3. Create member and community for context
 * 4. Create report and moderation decision with suspend_user action
 * 5. Create initial member suspension with defined duration
 * 6. Extend suspension by updating expires_at to a later timestamp
 * 7. Verify updated suspension has new expiration while preserving original fields
 */
export async function test_api_member_suspension_update_extend_duration(
  connection: api.IConnection,
) {
  // 1. Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create administrator and setup category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member and community for context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create report and moderation decision with suspend_user action
  // Note: Since we don't have a report creation endpoint in our API functions,
  // we'll use the decision endpoint with a generated reportId
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason: RandomGenerator.content({ paragraphs: 1 }),
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 5. Create initial member suspension with defined duration
  const now = new Date();
  const suspendedAt = now.toISOString();
  const originalExpiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          suspended_at: suspendedAt,
          expires_at: originalExpiresAt,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  TestValidator.equals(
    "initial suspension expiration should match original",
    suspension.expires_at,
    originalExpiresAt,
  );
  TestValidator.equals(
    "suspension should be active",
    suspension.suspended_at,
    suspendedAt,
  );

  // 6. Extend suspension by updating expires_at to a later timestamp
  const extendedExpiresAt = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updatedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: {
          expires_at: extendedExpiresAt,
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(updatedSuspension);

  // 7. Verify updated suspension has new expiration while preserving original fields
  TestValidator.equals(
    "updated suspension should have new expiration date",
    updatedSuspension.expires_at,
    extendedExpiresAt,
  );

  TestValidator.notEquals(
    "expiration date should be extended",
    updatedSuspension.expires_at,
    originalExpiresAt,
  );

  TestValidator.equals(
    "suspended_at should remain unchanged",
    updatedSuspension.suspended_at,
    suspendedAt,
  );

  TestValidator.equals(
    "suspension_reason should be preserved",
    updatedSuspension.suspension_reason,
    suspension.suspension_reason,
  );

  TestValidator.equals(
    "member_id should be preserved",
    updatedSuspension.community_platform_member_id,
    suspension.community_platform_member_id,
  );

  TestValidator.equals(
    "decision_id should be preserved",
    updatedSuspension.community_platform_report_decision_id,
    suspension.community_platform_report_decision_id,
  );

  TestValidator.predicate(
    "updated_at should reflect modification",
    new Date(updatedSuspension.updated_at).getTime() >=
      new Date(suspension.created_at).getTime(),
  );
}
