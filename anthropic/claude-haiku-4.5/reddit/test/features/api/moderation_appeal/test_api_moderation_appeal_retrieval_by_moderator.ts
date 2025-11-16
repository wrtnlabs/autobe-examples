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
 * Test retrieving a moderation appeal by a moderator with access to the appeal.
 *
 * Moderators should be able to view appeals related to their communities or
 * decisions they made to understand appeal outcomes and learn from reversals.
 * This test validates that moderators can access the appeal with complete
 * information including the appellant's explanation, supporting evidence, and
 * current review status. The test covers scenarios where moderators retrieve
 * appeals and verify complete appeal information is returned.
 *
 * Workflow:
 *
 * 1. Create a member account
 * 2. Create a moderator account (initial decision maker)
 * 3. Create a moderator account (appeal reviewer)
 * 4. Create a moderation decision (appeal target)
 * 5. Member submits an appeal against the decision
 * 6. Reviewer moderator retrieves the appeal
 * 7. Verify complete appeal information is returned
 */
export async function test_api_moderation_appeal_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account to submit appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account for making initial decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create a second moderator (appeal reviewer)
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewer: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: reviewerEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(reviewer);

  // Step 4: Switch to moderator and create moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create moderation decision on a report
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy with repeated personal attacks and threats toward other members.",
          internal_notes:
            "Third violation by this user in 30 days. Pattern of escalating behavior detected.",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 5: Switch to member and submit an appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Submit appeal against the decision
  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I was defending myself against false accusations in that thread. My response was taken completely out of context. The original allegations against me were unfounded and I was exercising my right to respond to defamatory statements.",
          supporting_evidence:
            "https://example.com/thread-context-evidence with timestamps and full conversation history",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal status should be submitted initially",
    appeal.appeal_status,
    "submitted",
  );

  // Step 6: Switch to reviewer moderator and retrieve the appeal
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: reviewerEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Retrieve the appeal by ID
  const retrievedAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderationAppeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(retrievedAppeal);

  // Step 7: Verify complete appeal information is returned
  TestValidator.equals(
    "appeal ID should match retrieved appeal",
    retrievedAppeal.id,
    appeal.id,
  );
  TestValidator.equals(
    "appeal reason should be preserved",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );
  TestValidator.equals(
    "supporting evidence should be accessible",
    retrievedAppeal.supporting_evidence,
    appeal.supporting_evidence,
  );
  TestValidator.equals(
    "appeal status should remain submitted",
    retrievedAppeal.appeal_status,
    "submitted",
  );
  TestValidator.predicate(
    "appellant information must be present",
    retrievedAppeal.appellant !== null &&
      retrievedAppeal.appellant !== undefined &&
      retrievedAppeal.appellant.id !== null,
  );
  TestValidator.predicate(
    "decision information must be present",
    retrievedAppeal.decision !== null &&
      retrievedAppeal.decision !== undefined &&
      retrievedAppeal.decision.id !== null,
  );
  TestValidator.equals(
    "decision action type should be preserved",
    retrievedAppeal.decision.action_type,
    "suspend_user",
  );
  TestValidator.predicate(
    "appeal must contain creation and submission timestamps",
    retrievedAppeal.submitted_at !== null &&
      retrievedAppeal.submitted_at !== undefined &&
      retrievedAppeal.created_at !== null &&
      retrievedAppeal.created_at !== undefined,
  );
  TestValidator.predicate(
    "appeal reason should meet minimum length requirement",
    retrievedAppeal.appeal_reason.length >= 50,
  );
}
