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
 * Test submitting a moderation appeal without supporting evidence.
 *
 * This test validates that members can submit appeals with only the required
 * appeal_reason field, confirming that supporting evidence is optional. The
 * test creates necessary prerequisite data (member, moderator, report,
 * decision) and then submits an appeal without providing supporting evidence.
 */
export async function test_api_moderation_appeal_member_submit_appeal_without_supporting_evidence(
  connection: api.IConnection,
) {
  // Step 1: Register member who will submit the appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Register moderator for decision creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: moderatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email should match registration",
    moderator.email,
    moderatorEmail,
  );

  // Step 3: Create a report (using generated UUID for the reportId)
  // Note: In a complete workflow, a report would be created through a separate API endpoint
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create a moderation decision on the report
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.equals(
    "decision action type should be remove_content",
    decision.action_type,
    "remove_content",
  );
  TestValidator.equals(
    "decision moderator should match registered moderator",
    decision.moderator.id,
    moderator.id,
  );

  // Step 5: Switch back to member authentication using stored password
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Submit moderation appeal WITHOUT supporting evidence
  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          // supporting_evidence is intentionally omitted to test optional field
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 7: Validate the appeal was created with null supporting_evidence
  TestValidator.equals(
    "appeal supporting_evidence should be null when not provided",
    appeal.supporting_evidence,
    null,
  );

  // Step 8: Confirm appeal status is correct
  TestValidator.equals(
    "appeal status should be submitted",
    appeal.appeal_status,
    "submitted",
  );

  // Verify decision reference is correct
  TestValidator.equals(
    "appeal decision ID should match created decision",
    appeal.community_platform_report_decision_id,
    decision.id,
  );

  // Verify member reference
  TestValidator.equals(
    "appeal member ID should match registered member",
    appeal.community_platform_member_id,
    member.id,
  );

  // Verify appeal reason exists and meets minimum length requirement
  TestValidator.predicate(
    "appeal reason should meet minimum 50 character length",
    appeal.appeal_reason.length >= 50,
  );

  // Verify appeal reason does not exceed maximum length
  TestValidator.predicate(
    "appeal reason should not exceed maximum 1000 character length",
    appeal.appeal_reason.length <= 1000,
  );
}
