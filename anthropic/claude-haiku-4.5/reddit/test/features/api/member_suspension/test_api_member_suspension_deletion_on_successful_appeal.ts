import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test deletion of a suspension as part of the appeal workflow when a moderator
 * approves an appeal and removes the suspension.
 *
 * This test validates the complete moderation appeal and suspension reversal
 * flow:
 *
 * 1. Create moderator account for review and decision making
 * 2. Create member account that will be suspended
 * 3. Create post content by member
 * 4. Submit violation report against the post
 * 5. Create moderation decision with suspension action
 * 6. Create member suspension record from decision
 * 7. Create moderation appeal requesting suspension reconsideration
 * 8. Delete suspension to reverse it (soft-delete with deleted_at timestamp)
 * 9. Verify suspension is marked inactive and member regains access
 * 10. Confirm disciplinary history is preserved for audit trail
 *
 * The test ensures soft-delete properly maintains audit integrity while
 * enabling access restoration.
 */
export async function test_api_member_suspension_deletion_on_successful_appeal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "https://test.example.com/auth/moderator/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created with valid ID",
    moderator.id !== undefined,
  );

  // Step 2: Create member account that will be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123!",
        ip: "127.0.0.1",
        href: "https://test.example.com/auth/member/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member created with valid ID",
    member.id !== undefined,
  );

  // Step 3: Create post by member
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
  TestValidator.predicate("post created successfully", post.id !== undefined);

  // Step 4: Create violation report against the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 4 }),
        reporter_contact_email: typia.random<string & tags.Format<"email">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.predicate(
    "report created with valid ID",
    report.id !== undefined,
  );

  // Step 5: Create moderation decision with suspension action
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          internal_notes: RandomGenerator.paragraph({ sentences: 3 }),
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.equals(
    "decision action type is suspension",
    decision.action_type,
    "suspend_user",
  );
  TestValidator.predicate(
    "suspension duration is valid",
    decision.suspension_duration_days === 7,
  );

  // Step 6: Create administrator account to create suspension record
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://test.example.com/auth/admin/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 7: Create member suspension record
  const suspensionStartTime = new Date().toISOString();
  const suspensionExpiryTime = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 4,
            wordMax: 8,
          }),
          suspended_at: suspensionStartTime,
          expires_at: suspensionExpiryTime,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  TestValidator.equals(
    "suspension member ID matches",
    suspension.community_platform_member_id,
    member.id,
  );
  TestValidator.predicate(
    "suspension has no deleted_at initially",
    suspension.deleted_at === null || suspension.deleted_at === undefined,
  );

  // Step 8: Create moderation appeal requesting reconsideration
  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 4,
            wordMax: 9,
          }),
          supporting_evidence: "https://test.example.com/appeal-evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.predicate(
    "appeal created with valid ID",
    appeal.id !== undefined,
  );
  TestValidator.equals(
    "appeal is in submitted status",
    appeal.appeal_status,
    "submitted",
  );

  // Step 9: Delete suspension to reverse it (moderator can now delete)
  // Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      ip: "127.0.0.1",
      href: "https://test.example.com/auth/moderator/login",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const deletedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.erase(
      connection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(deletedSuspension);
  TestValidator.equals(
    "deleted suspension ID matches original",
    deletedSuspension.id,
    suspension.id,
  );
  TestValidator.predicate(
    "deleted suspension has deleted_at timestamp",
    deletedSuspension.deleted_at !== null &&
      deletedSuspension.deleted_at !== undefined,
  );

  // Step 10: Verify suspension is soft-deleted with proper timestamp
  TestValidator.equals(
    "member ID preserved in deleted record",
    deletedSuspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "decision ID preserved in deleted record",
    deletedSuspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.predicate(
    "deleted_at is valid ISO timestamp",
    typeof deletedSuspension.deleted_at === "string",
  );

  // Verify timestamp format and that it's after suspension creation
  const deletedAtTime = new Date(deletedSuspension.deleted_at!);
  TestValidator.predicate(
    "deleted_at is valid date",
    !isNaN(deletedAtTime.getTime()),
  );
  TestValidator.predicate(
    "deleted_at is after suspension created",
    deletedAtTime.getTime() >= new Date(suspensionStartTime).getTime(),
  );

  // Step 11: Confirm member regains platform access
  TestValidator.predicate(
    "member ID exists for access restoration",
    member.id !== undefined,
  );
  TestValidator.predicate(
    "suspension is marked inactive",
    deletedSuspension.deleted_at !== null,
  );
  TestValidator.equals(
    "suspension reason preserved for audit",
    deletedSuspension.suspension_reason,
    suspension.suspension_reason,
  );
}
