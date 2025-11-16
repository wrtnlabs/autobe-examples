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
 * Test deletion of a member suspension by a moderator, effectively reversing
 * the disciplinary action and restoring member access.
 *
 * This test validates the complete suspension deletion workflow:
 *
 * 1. Create moderator and member accounts for disciplinary workflow
 * 2. Create content to report (violation)
 * 3. File report and create moderation decision with suspension
 * 4. Create suspension record in the system
 * 5. Delete suspension as moderator via the target endpoint
 * 6. Verify soft-deletion with deleted_at timestamp
 * 7. Confirm member access is restored and suspension is inactive
 *
 * The test ensures that suspension deletion soft-deletes the record (setting
 * deleted_at) rather than permanently removing it, preserving audit trail and
 * historical records for compliance purposes while immediately lifting access
 * restrictions.
 */
export async function test_api_member_suspension_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for suspension management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account that will have suspension deleted
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create post by member to be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: RandomGenerator.pick(["text", "link", "image"] as const),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: File content violation report against the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: RandomGenerator.pick([
          "spam",
          "harassment",
          "hate_speech",
          "misinformation",
        ] as const),
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: typia.random<string & tags.Format<"email">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 5: Switch to moderator and create decision with suspension
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.moderator.login(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
          suspension_duration_days: RandomGenerator.pick([
            1, 3, 7, 14, 30,
          ] as const),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Create administrator account and switch to create suspension
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create suspension record via administrator
  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          suspended_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Verify suspension was created with required fields
  TestValidator.equals(
    "suspension member matches",
    suspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension decision matches",
    suspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.predicate(
    "suspension has no deleted_at initially",
    suspension.deleted_at === null || suspension.deleted_at === undefined,
  );

  // Step 7: Delete suspension as moderator using the target endpoint
  const deletedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.erase(
      moderatorConnection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(deletedSuspension);

  // Step 8: Verify soft-deletion with deleted_at timestamp
  TestValidator.equals(
    "deleted suspension id matches",
    deletedSuspension.id,
    suspension.id,
  );
  TestValidator.predicate(
    "suspension has deleted_at timestamp after deletion",
    deletedSuspension.deleted_at !== null &&
      deletedSuspension.deleted_at !== undefined,
  );
  TestValidator.equals(
    "deleted suspension member unchanged",
    deletedSuspension.community_platform_member_id,
    member.id,
  );

  // Step 9: Verify the suspension record contains all original details plus deletion timestamp
  TestValidator.equals(
    "deleted suspension reason preserved",
    deletedSuspension.suspension_reason,
    suspension.suspension_reason,
  );
  TestValidator.equals(
    "deleted suspension maintains decision reference",
    deletedSuspension.community_platform_report_decision_id,
    decision.id,
  );

  // Step 10: Confirm member access is restored (suspension is inactive)
  TestValidator.predicate(
    "member should have access restored via soft-deletion",
    deletedSuspension.deleted_at !== null,
  );
}
