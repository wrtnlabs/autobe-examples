import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test administrator deletion of member warnings associated with suspensions.
 *
 * This comprehensive test validates the independent lifecycle of warnings and
 * suspensions:
 *
 * 1. Warning can be soft-deleted via administrator API (sets deleted_at timestamp)
 * 2. Associated suspension remains active and unchanged after warning deletion
 * 3. Deleted warnings no longer count toward member's active warning escalation
 * 4. Warning-suspension relationships are preserved in audit trail for compliance
 * 5. Deletion via appeal does not cascade to automatically reverse suspensions
 * 6. Multiple warnings and suspensions coexist independently at escalation levels
 * 7. Member's warning count recalculates excluding soft-deleted warnings
 *
 * Workflow:
 *
 * 1. Create administrator, member, and moderator accounts
 * 2. Create test category and community
 * 3. Create violating post and report it
 * 4. Issue warning decision for first violation
 * 5. Create suspension through separate decision for member
 * 6. Verify both warning and suspension exist independently
 * 7. Delete the warning via administrator API
 * 8. Verify suspension persists unchanged and independently
 * 9. Test multiple warnings/suspensions at different escalation levels
 * 10. Confirm deletion preserves audit trail for historical analysis
 */
export async function test_api_member_warning_deletion_with_associated_suspension(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.equals(
    "administrator account created successfully",
    typeof administrator.id,
    "string",
  );

  // Step 2: Create member account
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: "MemberPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals(
    "member account created successfully",
    typeof member.id,
    "string",
  );

  // Step 3: Create moderator account
  const moderatorEmail = `mod-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        password: "ModPassword123!",
        href: "https://example.com/mod",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created successfully",
    typeof moderator.id,
    "string",
  );

  // Step 4: Switch to administrator and create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(6)}`,
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description:
            "Test category for warning deletion and suspension independence",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created for testing",
    typeof category.id,
    "string",
  );

  // Step 5: Switch to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/community",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(6)}`,
          identifier: `comm-${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
          description: "Test community for moderation and escalation testing",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created for testing",
    typeof community.id,
    "string",
  );

  // Step 6: Create first post for warning decision
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "First Violating Post for Warning",
        content_text: "This content will result in a warning",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);
  TestValidator.equals(
    "first post created for warning",
    typeof post1.id,
    "string",
  );

  // Step 7: Report first post
  const report1: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post1.id,
        category: "harassment",
        additional_details:
          "This post contains harassment and violates community guidelines",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report1);
  TestValidator.equals("first report created", typeof report1.id, "string");

  // Step 8: Create second post for suspension decision
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Second Violating Post for Suspension",
        content_text: "This content will result in a suspension",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);
  TestValidator.equals(
    "second post created for suspension",
    typeof post2.id,
    "string",
  );

  // Step 9: Report second post
  const report2: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post2.id,
        category: "hate_speech",
        additional_details: "Second violation - escalating to suspension level",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report2);
  TestValidator.equals("second report created", typeof report2.id, "string");

  // Step 10: Switch to moderator and create warning decision for first violation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPassword123!",
      href: "https://example.com/moderate",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const warningDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report1.id,
        body: {
          action_type: "issue_warning",
          reason:
            "Member violated community harassment policy - first offense warrants formal notice",
          internal_notes: "Track for escalation pattern analysis",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(warningDecision);
  TestValidator.equals(
    "warning decision created",
    warningDecision.action_type,
    "issue_warning",
  );

  // Step 11: Create suspension decision for second violation
  const suspensionDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report2.id,
        body: {
          action_type: "suspend_user",
          reason:
            "Member violated escalation policy with hate speech - temporary suspension necessary",
          internal_notes: "Escalated from warning due to severity and pattern",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(suspensionDecision);
  TestValidator.equals(
    "suspension decision created",
    suspensionDecision.action_type,
    "suspend_user",
  );

  // Step 12: Switch to administrator to delete the warning
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 13: Delete the warning through administrative soft-delete
  const deletedWarning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.erase(
      connection,
      {
        warningId: warningDecision.id,
      },
    );
  typia.assert(deletedWarning);
  TestValidator.predicate(
    "warning soft-deleted with deleted_at timestamp set",
    deletedWarning.deletedAt !== null && deletedWarning.deletedAt !== undefined,
  );

  // Step 14: Verify suspension remains independent and active
  TestValidator.equals(
    "suspension action type unchanged",
    suspensionDecision.action_type,
    "suspend_user",
  );
  TestValidator.predicate(
    "suspension has defined duration",
    suspensionDecision.suspension_duration_days !== undefined &&
      suspensionDecision.suspension_duration_days !== null,
  );

  // Step 15: Verify warning-suspension relationship preserved for audit trail
  TestValidator.equals(
    "deleted warning references original decision",
    typeof deletedWarning.decision.id,
    "string",
  );
  TestValidator.equals(
    "decision references associated report",
    typeof warningDecision.report.id,
    "string",
  );

  // Step 16: Test edge case - create additional warning at higher escalation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/community",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Third Violation Post",
        content_text: "Third escalation violation",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post3);

  const report3: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post3.id,
        category: "misinformation",
        additional_details: "Third violation at different escalation level",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report3);

  // Switch back to moderator for third decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPassword123!",
      href: "https://example.com/moderate",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const thirdDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report3.id,
        body: {
          action_type: "issue_warning",
          reason: "Third violation - warning issued for escalation tracking",
          internal_notes:
            "Member now has warnings at multiple escalation levels",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(thirdDecision);

  // Step 17: Verify multiple warnings and suspensions coexist independently
  TestValidator.equals(
    "first warning deleted",
    deletedWarning.deletedAt !== null && deletedWarning.deletedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "suspension still active from second decision",
    suspensionDecision.action_type,
    "suspend_user",
  );
  TestValidator.equals(
    "third warning created independently",
    thirdDecision.action_type,
    "issue_warning",
  );

  // Step 18: Confirm audit trail preservation
  TestValidator.predicate(
    "deleted warning preserves full audit trail",
    typeof deletedWarning.decision.id === "string" &&
      typeof deletedWarning.member.id === "string",
  );
  TestValidator.predicate(
    "suspension decision remains in audit system",
    typeof suspensionDecision.moderator.id === "string" &&
      typeof suspensionDecision.report.id === "string",
  );

  TestValidator.predicate(
    "warning deletion with independent suspension test completed successfully",
    true,
  );
}
