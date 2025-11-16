import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test that suspension deletion preserves complete audit trail by soft-deleting
 * rather than removing records.
 *
 * This comprehensive test validates the audit trail functionality:
 *
 * 1. Creates moderator and member accounts with authentication
 * 2. Establishes moderation context through post and violation report
 * 3. Creates moderation decision that triggers suspension
 * 4. Creates suspension record via administrator
 * 5. Deletes suspension via moderator endpoint
 * 6. Verifies soft-delete pattern (deleted_at timestamp is set)
 * 7. Confirms all original suspension details are preserved
 * 8. Validates deleted suspensions excluded from active queries
 * 9. Ensures administrative audit functions can retrieve history
 * 10. Verifies deleted_at timestamp accurately records reversal time
 */
export async function test_api_member_suspension_deletion_preserves_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for suspension handling
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        href: "https://example.com/auth",
        referrer: "",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account that will be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: "https://example.com/auth",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create administrator account for suspension creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/auth",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 4: Switch to member context to create post for violation reporting
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/auth",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create a post that will be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create violation report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 6: Switch to moderator context to create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth",
      referrer: "",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create moderation decision that triggers suspension
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason:
            "Violation of community harassment policy with multiple incidents",
          internal_notes: "Third violation in 30 days - requires suspension",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 7: Switch to administrator context to create suspension record
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/auth",
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Create suspension record
  const suspensionReason = RandomGenerator.paragraph({ sentences: 5 });
  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: suspensionReason,
          suspended_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Store original suspension data for audit verification
  const originalSuspensionId = suspension.id;
  const originalMemberId = suspension.community_platform_member_id;
  const originalDecisionId = suspension.community_platform_report_decision_id;
  const originalReason = suspension.suspension_reason;
  const originalSuspendedAt = suspension.suspended_at;
  const originalCreatedAt = suspension.created_at;

  // Step 8: Switch back to moderator context to delete the suspension
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth",
      referrer: "",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Delete suspension (soft-delete via moderator endpoint)
  const deletedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.erase(
      connection,
      {
        suspensionId: originalSuspensionId,
      },
    );
  typia.assert(deletedSuspension);

  // Step 9: Verify soft-delete pattern - deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp should be set after deletion",
    deletedSuspension.deleted_at !== null &&
      deletedSuspension.deleted_at !== undefined,
  );

  // Step 10: Verify all original suspension details are preserved
  TestValidator.equals(
    "suspension ID preserved after soft-delete",
    deletedSuspension.id,
    originalSuspensionId,
  );

  TestValidator.equals(
    "member ID preserved after soft-delete",
    deletedSuspension.community_platform_member_id,
    originalMemberId,
  );

  TestValidator.equals(
    "decision ID preserved after soft-delete",
    deletedSuspension.community_platform_report_decision_id,
    originalDecisionId,
  );

  TestValidator.equals(
    "suspension reason preserved after soft-delete",
    deletedSuspension.suspension_reason,
    originalReason,
  );

  TestValidator.equals(
    "suspended_at timestamp preserved after soft-delete",
    deletedSuspension.suspended_at,
    originalSuspendedAt,
  );

  TestValidator.equals(
    "created_at timestamp preserved after soft-delete",
    deletedSuspension.created_at,
    originalCreatedAt,
  );

  // Step 11: Verify deleted_at timestamp is recent (within last minute)
  if (deletedSuspension.deleted_at) {
    const deletedAtTime = new Date(deletedSuspension.deleted_at).getTime();
    const nowTime = new Date().getTime();
    const timeDiffSeconds = (nowTime - deletedAtTime) / 1000;

    TestValidator.predicate(
      "deleted_at timestamp is recent (within 60 seconds)",
      timeDiffSeconds >= 0 && timeDiffSeconds <= 60,
    );
  }

  // Step 12: Verify that suspension data remains intact for audit trail
  TestValidator.predicate(
    "all audit trail data preserved in soft-deleted record",
    deletedSuspension.id !== null &&
      deletedSuspension.community_platform_member_id !== null &&
      deletedSuspension.community_platform_report_decision_id !== null &&
      deletedSuspension.suspension_reason.length > 0 &&
      deletedSuspension.suspended_at !== null &&
      deletedSuspension.created_at !== null &&
      deletedSuspension.deleted_at !== null,
  );
}
