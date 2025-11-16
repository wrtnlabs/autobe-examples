import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_appeal_moderator_retrieve_appeal_completed_approved(
  connection: api.IConnection,
) {
  // 1. Register member who will submit the appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(),
      password: "TestPassword123!",
      href: "http://localhost/auth/register",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Register original decision moderator
  const decisionModeratorEmail = typia.random<string & tags.Format<"email">>();
  const decisionModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: decisionModeratorEmail,
        username: RandomGenerator.name(),
        password: "ModeratorPass123!",
        href: "http://localhost/auth/register",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(decisionModerator);

  // 3. Register review moderator (different moderator for appeal review)
  const reviewModeratorEmail = typia.random<string & tags.Format<"email">>();
  const reviewModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: reviewModeratorEmail,
      username: RandomGenerator.name(),
      password: "ReviewerPass123!",
      href: "http://localhost/auth/register",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(reviewModerator);

  // 4. Switch to decision moderator and create a report decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: decisionModeratorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost/auth/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy with repeated personal attacks and threats toward other members",
          internal_notes:
            "Third violation by this user within 30 days. Clear pattern of escalating behavior.",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 5. Switch to member and submit an appeal against the decision
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost/auth/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe the suspension decision was made in error. My recent posts were providing historical context and educational perspective on the topic under discussion. The moderator appears to have misinterpreted constructive dialogue as personal attacks. I respectfully request a review of the original report and decision.",
          supporting_evidence:
            "https://example.com/appeal-evidence/context-documentation.html",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // 6. Switch to review moderator to retrieve and verify the appeal
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: reviewModeratorEmail,
      password: "ReviewerPass123!",
      href: "http://localhost/auth/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Retrieve the appeal by its ID to validate moderator access
  const retrievedAppeal =
    await api.functional.communityPlatform.moderator.moderationAppeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // 8. Validate core appeal data structure
  TestValidator.equals(
    "retrieved appeal ID should match submitted appeal",
    retrievedAppeal.id,
    appeal.id,
  );
  TestValidator.equals(
    "appellant member ID should match",
    retrievedAppeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "appellant email should be accessible",
    retrievedAppeal.appellant.email,
    memberEmail,
  );

  // 9. Validate appeal content preservation
  TestValidator.equals(
    "appeal reason should be preserved",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );
  TestValidator.equals(
    "supporting evidence should be preserved",
    retrievedAppeal.supporting_evidence,
    appeal.supporting_evidence,
  );

  // 10. Validate original decision context within appeal
  TestValidator.equals(
    "decision ID should match original decision",
    retrievedAppeal.decision.id,
    decision.id,
  );
  TestValidator.equals(
    "decision action type should show what was decided",
    retrievedAppeal.decision.action_type,
    "suspend_user",
  );
  TestValidator.equals(
    "decision reason should be accessible for review",
    retrievedAppeal.decision.reason,
    decision.reason,
  );
  TestValidator.predicate(
    "original decision moderator should be identified",
    retrievedAppeal.decision.moderator_username.length > 0,
  );

  // 11. Validate appellant reputation information
  TestValidator.predicate(
    "appellant should have account status",
    ["active", "suspended", "pending_deletion", "deleted"].includes(
      retrievedAppeal.appellant.account_status,
    ),
  );
  TestValidator.predicate(
    "appellant karma score should be accessible",
    retrievedAppeal.appellant.karma_score >= 0,
  );

  // 12. Validate appeal lifecycle and timestamps
  TestValidator.predicate(
    "appeal status should indicate workflow state",
    ["submitted", "in_review", "approved", "denied", "reduced"].includes(
      retrievedAppeal.appeal_status,
    ),
  );
  TestValidator.predicate(
    "submitted_at should be valid timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAppeal.submitted_at),
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAppeal.created_at),
  );

  // 13. Validate that moderator visibility enables learning from decisions
  TestValidator.predicate(
    "moderator can review appeal and understand reversal decisions for learning",
    retrievedAppeal.appeal_reason.length > 0 &&
      retrievedAppeal.decision.reason.length > 0 &&
      retrievedAppeal.appellant.id.length > 0,
  );
}
