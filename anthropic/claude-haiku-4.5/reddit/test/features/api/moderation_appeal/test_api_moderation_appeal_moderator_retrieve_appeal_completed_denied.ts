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

/**
 * Test moderator retrieving a moderation appeal and validating its structure.
 *
 * This test validates the moderation appeal workflow including:
 *
 * 1. Member and moderator account creation
 * 2. Report submission and decision creation
 * 3. Appeal submission by member
 * 4. Appeal retrieval by moderator
 * 5. Validation of appeal structure and data integrity
 *
 * The test ensures that moderators can view appeals and understand the appeal
 * context including the original decision and member reasoning.
 *
 * Steps:
 *
 * 1. Register a member account
 * 2. Register original decision moderator
 * 3. Register appeal reviewer moderator
 * 4. Create a report with moderation decision
 * 5. Submit appeal with member reasoning
 * 6. Retrieve appeal as moderator
 * 7. Validate appeal structure and all required fields
 * 8. Verify appellant and decision information are accessible
 */
export async function test_api_moderation_appeal_moderator_retrieve_appeal_completed_denied(
  connection: api.IConnection,
) {
  // Step 1: Register member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Register original decision moderator
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        username: RandomGenerator.name(1),
        password: "ModPassword123!",
        href: "https://example.com/mod-register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);

  // Step 3: Register appeal reviewer moderator
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        username: RandomGenerator.name(1),
        password: "ReviewerPass123!",
        href: "https://example.com/reviewer-register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 4: Create a report with moderation decision (using moderator1)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator1Email,
      password: "ModPassword123!",
      href: "https://example.com/mod-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create decision with a valid report ID
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason:
            "Content violates community harassment policy with personal attacks and threats toward other members",
          internal_notes:
            "Repeat offender, third violation in 30 days. User has prior warning for similar violations.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 5: Submit appeal (switch to member)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/member-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "The content was educational discussion about historical events and not a personal attack as claimed. The moderator did not consider the full context of the thread where I was providing factual information and the decision was made without understanding the discussion context.",
          supporting_evidence: "https://example.com/context-thread-discussion",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Validate initial appeal structure
  TestValidator.equals(
    "appeal status should be submitted initially",
    appeal.appeal_status,
    "submitted",
  );

  TestValidator.equals(
    "appeal appellant should match member",
    appeal.appellant.id,
    member.id,
  );

  TestValidator.equals(
    "appeal decision should match created decision",
    appeal.decision.id,
    decision.id,
  );

  // Step 6: Retrieve appeal as moderator (switch to moderator2)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: "ReviewerPass123!",
      href: "https://example.com/mod-login-review",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const retrievedAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderator.moderationAppeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 7 & 8: Validate appeal structure and all required fields
  TestValidator.equals(
    "retrieved appeal ID should match submitted appeal",
    retrievedAppeal.id,
    appeal.id,
  );

  TestValidator.equals(
    "retrieved appeal reason should match",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );

  TestValidator.equals(
    "retrieved appeal status should match submitted status",
    retrievedAppeal.appeal_status,
    appeal.appeal_status,
  );

  TestValidator.equals(
    "retrieved appellant should match member",
    retrievedAppeal.appellant.id,
    member.id,
  );

  TestValidator.equals(
    "retrieved decision should match original decision",
    retrievedAppeal.decision.id,
    decision.id,
  );

  TestValidator.equals(
    "decision action type should be remove_content",
    retrievedAppeal.decision.action_type,
    "remove_content",
  );

  TestValidator.predicate(
    "appeal should have submitted timestamp",
    retrievedAppeal.submitted_at !== null &&
      retrievedAppeal.submitted_at !== undefined,
  );

  TestValidator.predicate(
    "appeal should have supporting evidence",
    retrievedAppeal.supporting_evidence !== null &&
      retrievedAppeal.supporting_evidence !== undefined,
  );
}
