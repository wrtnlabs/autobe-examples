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
 * Test updating a member suspension to reduce its expiration date, shortening
 * the restriction period.
 *
 * This test validates the administrative workflow for modifying suspension
 * durations. The scenario includes creating user accounts (administrator,
 * member, moderator), establishing a violation through content reporting and
 * moderation, issuing a suspension, and then reducing the suspension duration
 * by updating the expiration date to an earlier timestamp.
 *
 * Key validations:
 *
 * 1. Initial suspension creation with future expiration date
 * 2. Reduction of expiration date to earlier timestamp
 * 3. ISO 8601 UTC format compliance for date fields
 * 4. Updated_at timestamp reflects the modification
 * 5. Suspension reason can be updated with additional context
 * 6. Structural fields remain immutable (member_id, decision_id, suspended_at)
 * 7. New expiration is logically after suspended_at and in the future
 */
export async function test_api_member_suspension_update_expiration_reduction(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://platform.example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "https://platform.example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "ModeratorPassword123!",
        href: "https://platform.example.com/moderator",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Switch to moderator account to create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://platform.example.com/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 5. Create a post by member (for context)
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

  // 6. Create a report for the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: "This post violates community guidelines.",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 7. Create moderation decision to suspend member
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: "Post violates community spam policy and guidelines.",
          internal_notes: "First violation by this member.",
          suspension_duration_days: 30,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 8. Switch back to administrator account
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://platform.example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 9. Create initial suspension with 30-day duration
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const initialSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason:
            "Member posted spam content violating community guidelines. Initial 30-day suspension.",
          suspended_at: now.toISOString(),
          expires_at: thirtyDaysFromNow.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(initialSuspension);

  // Validate initial suspension
  TestValidator.equals(
    "initial suspension member ID matches",
    initialSuspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "initial suspension decision ID matches",
    initialSuspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.predicate(
    "initial suspension expires_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      initialSuspension.expires_at || "",
    ),
  );

  // 10. Update suspension to reduce expiration (shorten duration to 14 days)
  const fourteenDaysFromNow = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  );
  const updatedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.update(
      connection,
      {
        suspensionId: initialSuspension.id,
        body: {
          suspension_reason:
            "Member posted spam content. Suspension duration reduced to 14 days after review.",
          expires_at: fourteenDaysFromNow.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(updatedSuspension);

  // 11. Validate that expiration date was reduced
  TestValidator.notEquals(
    "updated suspension expires_at differs from initial",
    updatedSuspension.expires_at,
    initialSuspension.expires_at,
  );

  TestValidator.predicate(
    "updated expiration is earlier than initial",
    (updatedSuspension.expires_at || "") < (initialSuspension.expires_at || ""),
  );

  // 12. Validate updated_at timestamp reflects the change
  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedSuspension.updated_at),
  );
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    updatedSuspension.updated_at >= updatedSuspension.created_at,
  );

  // 13. Validate suspension reason was updated
  TestValidator.notEquals(
    "suspension reason was updated",
    updatedSuspension.suspension_reason,
    initialSuspension.suspension_reason,
  );
  TestValidator.predicate(
    "new reason includes reduction context",
    updatedSuspension.suspension_reason.includes("reduced"),
  );

  // 14. Validate immutable fields remain unchanged
  TestValidator.equals(
    "member ID is immutable",
    updatedSuspension.community_platform_member_id,
    initialSuspension.community_platform_member_id,
  );
  TestValidator.equals(
    "decision ID is immutable",
    updatedSuspension.community_platform_report_decision_id,
    initialSuspension.community_platform_report_decision_id,
  );
  TestValidator.equals(
    "suspended_at is immutable",
    updatedSuspension.suspended_at,
    initialSuspension.suspended_at,
  );

  // 15. Validate updated expiration is still in the future and valid
  TestValidator.predicate(
    "updated expires_at is after suspended_at",
    (updatedSuspension.expires_at || "") > updatedSuspension.suspended_at,
  );
  TestValidator.predicate(
    "updated expires_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      updatedSuspension.expires_at || "",
    ),
  );

  // 16. Verify the reduction is correctly reflected
  const initialExpirationDate = new Date(initialSuspension.expires_at || "");
  const updatedExpirationDate = new Date(updatedSuspension.expires_at || "");
  const reductionDays =
    (initialExpirationDate.getTime() - updatedExpirationDate.getTime()) /
    (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "expiration was reduced by approximately 16 days",
    Math.abs(reductionDays - 16) < 1,
  );
}
