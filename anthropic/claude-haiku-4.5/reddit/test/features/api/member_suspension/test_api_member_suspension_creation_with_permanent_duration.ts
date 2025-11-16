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
 * Test creation of a permanent member suspension with expires_at set to null.
 *
 * This test validates the complete workflow of creating a permanent suspension:
 *
 * 1. Creates and authenticates administrator account
 * 2. Creates and authenticates member account (to be suspended)
 * 3. Creates and authenticates moderator account
 * 4. Member creates a post with severe violation content
 * 5. Moderator submits a violation report
 * 6. Moderator makes a suspension decision
 * 7. Administrator creates permanent member suspension with expires_at = null
 * 8. Validates that the suspension record correctly reflects permanent status
 *
 * Permanent suspensions (expires_at = null) indicate indefinite restrictions
 * that persist until administratively reversed via soft-delete or other
 * action.
 */
export async function test_api_member_suspension_creation_with_permanent_duration(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "SecureAdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        href: "https://platform.example.com/admin/register",
        referrer: "https://platform.example.com",
      },
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account should be created",
    administrator.id !== undefined,
  );
  const adminId = administrator.id;

  // Step 2: Create and authenticate member (to be suspended)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "MemberPassword123!",
      href: "https://platform.example.com/member/register",
      referrer: "https://platform.example.com",
    },
  });
  typia.assert(member);
  TestValidator.predicate(
    "member account should be created",
    member.id !== undefined,
  );
  const memberId = member.id;

  // Step 3: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "ModeratorPassword123!",
      href: "https://platform.example.com/moderator/register",
      referrer: "https://platform.example.com",
    },
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account should be created",
    moderator.id !== undefined,
  );

  // Step 4: Switch to member context and create a violating post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://platform.example.com/member/login",
      referrer: "https://platform.example.com",
    },
  });

  const violatingPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: "Severe Violation Post",
        content_text: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_nsfw: true,
        has_spoiler: false,
      },
    });
  typia.assert(violatingPost);
  TestValidator.predicate(
    "violating post should be created",
    violatingPost.id !== undefined,
  );
  const postId = violatingPost.id;

  // Step 5: Switch to moderator context and submit violation report
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://platform.example.com/moderator/login",
      referrer: "https://platform.example.com",
    },
  });

  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: postId,
        category: "hate_speech",
        additional_details:
          "Post contains severe hate speech violating community standards",
        reporter_contact_email: moderatorEmail,
      },
    },
  );
  typia.assert(report);
  TestValidator.predicate("report should be created", report.id !== undefined);
  const reportId = report.id;

  // Step 6: Create moderation decision with suspend_user action
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "Severe violation of community hate speech policy with intent to harass",
          internal_notes:
            "Pattern of similar violations detected. Permanent suspension recommended.",
          suspension_duration_days: 30,
        },
      },
    );
  typia.assert(decision);
  TestValidator.predicate(
    "moderation decision should be created",
    decision.id !== undefined,
  );
  const decisionId = decision.id;

  // Step 7: Switch to administrator and create permanent suspension with expires_at = null
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "SecureAdminPassword123!",
      href: "https://platform.example.com/admin/login",
      referrer: "https://platform.example.com",
    },
  });

  const suspensionStartTime = new Date().toISOString();
  const permanentSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          community_platform_report_decision_id: decisionId,
          suspension_reason:
            "Permanent suspension issued for severe and repeated violations of community hate speech policy. Member remains restricted until administrative reversal.",
          suspended_at: suspensionStartTime,
          expires_at: null,
        },
      },
    );
  typia.assert(permanentSuspension);

  // Step 8: Validate the permanent suspension response
  TestValidator.predicate(
    "suspension should be created with correct member ID",
    permanentSuspension.community_platform_member_id === memberId,
  );

  TestValidator.predicate(
    "suspension should reference correct decision",
    permanentSuspension.community_platform_report_decision_id === decisionId,
  );

  TestValidator.equals(
    "expires_at should be null for permanent suspension",
    permanentSuspension.expires_at,
    null,
  );

  TestValidator.predicate(
    "suspension_reason should contain detailed explanation",
    permanentSuspension.suspension_reason.length >= 20,
  );

  TestValidator.predicate(
    "suspended_at should be properly recorded",
    permanentSuspension.suspended_at !== undefined,
  );

  TestValidator.predicate(
    "created_at timestamp should be present",
    permanentSuspension.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp should be present",
    permanentSuspension.updated_at !== undefined,
  );

  TestValidator.predicate(
    "deleted_at should be null for active suspension",
    permanentSuspension.deleted_at === null ||
      permanentSuspension.deleted_at === undefined,
  );

  TestValidator.predicate(
    "suspension ID should be valid",
    permanentSuspension.id !== undefined,
  );
}
