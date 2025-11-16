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
 * Validates the supporting_evidence field in moderation appeal submissions.
 *
 * Tests that the supporting_evidence field is properly validated:
 *
 * - Field is optional (null value allowed)
 * - Valid URLs are accepted
 * - Invalid URL formats are rejected
 * - Content exceeding 2048 characters is rejected
 * - URL format validation works correctly
 *
 * Complete workflow:
 *
 * 1. Create member account for appeal submission
 * 2. Create moderator account for decisions
 * 3. Create report and moderation decision to appeal
 * 4. Test various supporting_evidence scenarios and validations
 */
export async function test_api_moderation_appeal_submission_supporting_evidence_validation(
  connection: api.IConnection,
) {
  // 1. Create member account for appeal submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.name(1),
    password: memberPassword,
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);
  TestValidator.predicate(
    "member account created successfully",
    member.id !== null,
  );

  // 2. Create moderator account for decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.name(1),
    password: moderatorPassword,
    href: "https://example.com/moderator",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== null,
  );

  // 3. Create a mock report ID for testing appeal submission
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Create moderation decision
  const decisionData = {
    action_type: "remove_content" as const,
    reason:
      "Content violates community guidelines regarding harassment and offensive language towards other users",
    internal_notes: "Pattern detected in user's recent submissions",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      { reportId, body: decisionData },
    );
  typia.assert(decision);
  TestValidator.predicate("moderation decision created", decision.id !== null);

  // Switch back to member context for appeal submission
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Test 1: Submit appeal WITHOUT supporting_evidence (null)
  const appealWithoutEvidence = {
    community_platform_report_decision_id: decision.id,
    appeal_reason:
      "I believe this decision was made in error. The content was educational in nature and not intended to harass.",
    supporting_evidence: null,
  } satisfies ICommunityPlatformModerationAppeal.ICreate;

  const appeal1: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      { body: appealWithoutEvidence },
    );
  typia.assert(appeal1);
  TestValidator.predicate(
    "appeal without evidence submitted successfully",
    appeal1.supporting_evidence === null,
  );
  TestValidator.equals(
    "appeal status is submitted",
    appeal1.appeal_status,
    "submitted",
  );

  // Test 2: Submit appeal WITH valid URL format supporting_evidence
  const validUrl = "https://example.com/screenshot.png";
  const appealWithValidUrl = {
    community_platform_report_decision_id: decision.id,
    appeal_reason:
      "Please review the attached context which shows the content was misinterpreted.",
    supporting_evidence: validUrl,
  } satisfies ICommunityPlatformModerationAppeal.ICreate;

  const appeal2: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      { body: appealWithValidUrl },
    );
  typia.assert(appeal2);
  TestValidator.equals(
    "valid URL evidence stored correctly",
    appeal2.supporting_evidence,
    validUrl,
  );
  TestValidator.predicate("appeal with valid URL created", appeal2.id !== null);

  // Test 3: Submit appeal with INVALID URL format - should fail
  const invalidUrlAppeal = {
    community_platform_report_decision_id: decision.id,
    appeal_reason:
      "I disagree with this moderation decision based on the attached evidence.",
    supporting_evidence: "not-a-valid-url-format",
  } satisfies ICommunityPlatformModerationAppeal.ICreate;

  await TestValidator.error(
    "invalid URL format should fail validation",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        { body: invalidUrlAppeal },
      );
    },
  );

  // Test 4: Submit appeal with supporting_evidence EXCEEDING 2048 characters - should fail
  const excessiveEvidence = "https://example.com/" + "x".repeat(2050);

  const oversizeAppeal = {
    community_platform_report_decision_id: decision.id,
    appeal_reason: "This is my appeal with oversized evidence.",
    supporting_evidence: excessiveEvidence,
  } satisfies ICommunityPlatformModerationAppeal.ICreate;

  await TestValidator.error(
    "supporting_evidence exceeding 2048 characters should fail",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        { body: oversizeAppeal },
      );
    },
  );

  // Test 5: Submit appeal with valid file reference URL
  const fileReferenceUrl =
    "https://cdn.example.com/appeals/user-evidence-12345.pdf";
  const appealWithFileReference = {
    community_platform_report_decision_id: decision.id,
    appeal_reason:
      "Supporting documentation is available at the attached link.",
    supporting_evidence: fileReferenceUrl,
  } satisfies ICommunityPlatformModerationAppeal.ICreate;

  const appeal3: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      { body: appealWithFileReference },
    );
  typia.assert(appeal3);
  TestValidator.equals(
    "file reference URL stored correctly",
    appeal3.supporting_evidence,
    fileReferenceUrl,
  );
  TestValidator.predicate(
    "appeal with file reference created",
    appeal3.appeal_status === "submitted",
  );

  // Test 6: Verify URL format validation with various URL schemes
  const validUrlVariations = [
    "https://example.com/path",
    "http://example.com/file.txt",
    "https://subdomain.example.com/deep/path/to/file.png",
  ];

  for (const urlEvidence of validUrlVariations) {
    const appealWithVariation = {
      community_platform_report_decision_id: decision.id,
      appeal_reason:
        "Testing URL format validation with different URL schemes.",
      supporting_evidence: urlEvidence,
    } satisfies ICommunityPlatformModerationAppeal.ICreate;

    const appeal: ICommunityPlatformModerationAppeal =
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        { body: appealWithVariation },
      );
    typia.assert(appeal);
    TestValidator.equals(
      "URL format accepted",
      appeal.supporting_evidence,
      urlEvidence,
    );
  }
}
