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
 * Test moderator retrieving a moderation appeal in 'submitted' status before
 * reviewer assignment.
 *
 * This test validates the moderation appeal retrieval workflow by:
 *
 * 1. Setting up multiple user actors (member and moderators)
 * 2. Creating a moderation decision (prerequisite)
 * 3. Submitting an appeal against that decision
 * 4. Retrieving the appeal as a moderator to verify visibility and content
 *
 * The test ensures moderators can view submitted appeals available for
 * assignment and understand complete appeal details including the original
 * decision context.
 */
export async function test_api_moderation_appeal_moderator_retrieve_appeal_submitted(
  connection: api.IConnection,
) {
  // Step 1: Register member who will submit the appeal
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member should be authorized", member.id !== null);

  // Step 2: Register first moderator who will create the decision
  const moderator1Email: string = typia.random<string & tags.Format<"email">>();
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        username: RandomGenerator.name(1),
        password: "ModeratorPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);
  TestValidator.predicate(
    "moderator1 should be authorized",
    moderator1.id !== null,
  );

  // Step 3: Register second moderator who will retrieve the appeal
  const moderator2Email: string = typia.random<string & tags.Format<"email">>();
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        username: RandomGenerator.name(1),
        password: "ReviewerPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);
  TestValidator.predicate(
    "moderator2 should be authorized",
    moderator2.id !== null,
  );

  // Step 4: Create a report decision (moderator1 in connection)
  const reportId: string = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "issue_warning",
          reason:
            "Content violates community guidelines regarding harassment and inappropriate language",
          internal_notes: "First violation by this user, monitor for patterns",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.predicate(
    "decision should have valid ID",
    decision.id !== null,
  );

  // Step 5: Switch to member and submit an appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe the decision was unfair and did not consider the full context of the conversation. The warning should be reconsidered based on the surrounding discussion.",
          supporting_evidence: "https://example.com/evidence/appeal-context",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.predicate("appeal should have valid ID", appeal.id !== null);
  TestValidator.equals(
    "appeal status should be submitted",
    appeal.appeal_status,
    "submitted",
  );

  // Step 6: Switch to second moderator and retrieve the appeal
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: "ReviewerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
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

  // Validate the retrieved appeal contains correct information
  TestValidator.equals("appeal ID should match", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal status should remain submitted",
    retrievedAppeal.appeal_status,
    "submitted",
  );
  TestValidator.equals(
    "appeal reason should match",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );
  TestValidator.equals(
    "appellant ID should match",
    retrievedAppeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "decision ID should match",
    retrievedAppeal.decision.id,
    decision.id,
  );
  TestValidator.predicate(
    "reviewer should not be assigned in submitted state",
    retrievedAppeal.reviewer === null || retrievedAppeal.reviewer === undefined,
  );
  TestValidator.predicate(
    "reviewed_at should not be set for submitted appeals",
    retrievedAppeal.reviewed_at === null ||
      retrievedAppeal.reviewed_at === undefined,
  );
  TestValidator.predicate(
    "appeal outcome should not be set yet",
    retrievedAppeal.appeal_outcome === null ||
      retrievedAppeal.appeal_outcome === undefined,
  );
}
