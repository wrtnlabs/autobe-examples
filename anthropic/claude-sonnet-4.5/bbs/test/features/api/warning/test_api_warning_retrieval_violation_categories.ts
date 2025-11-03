import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";

/**
 * Test retrieving warnings across different violation categories to ensure all
 * warning types are properly stored and accessible.
 *
 * This test validates that the warning system correctly stores and returns
 * warnings for different violation categories including spam, harassment,
 * off-topic content, and misinformation. It ensures that each warning type
 * preserves detailed explanations and supports the progressive discipline
 * framework by clearly identifying violation types.
 *
 * Test Flow:
 *
 * 1. Create a member account to receive warnings
 * 2. Create a moderator account to issue warnings
 * 3. Issue warnings for different violation categories
 * 4. Retrieve each warning and validate category information
 */
export async function test_api_warning_retrieval_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create member account to receive warnings
  const memberRegistration = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(member);

  // Step 2: Create moderator account to issue warnings
  const moderatorRegistration = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorRegistration,
    });
  typia.assert(moderator);

  // Step 3: Issue warnings for different violation categories
  const violationCategories = [
    {
      reason: "spam",
      details:
        "User posted repetitive promotional content advertising external services without relevance to the discussion topic. This violates our spam policy.",
      severity: "moderate",
    },
    {
      reason: "harassment",
      details:
        "User engaged in personal attacks against another member, including derogatory language and intimidation. This behavior violates our harassment policy and community standards.",
      severity: "severe",
    },
    {
      reason: "off-topic content",
      details:
        "User repeatedly posted content unrelated to economic and political discussions, disrupting the thread focus. Please keep contributions relevant to the forum topics.",
      severity: "minor",
    },
    {
      reason: "misinformation",
      details:
        "User shared demonstrably false claims about economic data without credible sources, potentially misleading other members. Please verify information before posting.",
      severity: "moderate",
    },
  ] as const;

  const createdWarnings: IDiscussionBoardUserWarning[] = [];

  for (const violation of violationCategories) {
    const warningData = {
      discussion_board_member_id: member.id,
      warning_reason: violation.reason,
      warning_details: violation.details,
      severity: violation.severity,
    } satisfies IDiscussionBoardUserWarning.ICreate;

    const warning: IDiscussionBoardUserWarning =
      await api.functional.discussionBoard.moderator.moderation.warnings.create(
        connection,
        { body: warningData },
      );
    typia.assert(warning);
    createdWarnings.push(warning);

    // Validate the created warning has correct data
    TestValidator.equals(
      "warning reason matches",
      warning.warning_reason,
      violation.reason,
    );
    TestValidator.equals(
      "warning details match",
      warning.warning_details,
      violation.details,
    );
    TestValidator.equals(
      "severity matches",
      warning.severity,
      violation.severity,
    );
    TestValidator.equals(
      "member ID matches",
      warning.discussion_board_member_id,
      member.id,
    );
    TestValidator.equals(
      "moderator ID matches",
      warning.discussion_board_moderator_id,
      moderator.id,
    );
  }

  // Step 4: Retrieve each warning and validate that categorization is preserved
  for (let i = 0; i < createdWarnings.length; i++) {
    const createdWarning = createdWarnings[i];
    const violation = violationCategories[i];

    const retrievedWarning: IDiscussionBoardUserWarning =
      await api.functional.discussionBoard.moderation.warnings.at(connection, {
        warningId: createdWarning.id,
      });
    typia.assert(retrievedWarning);

    // Validate warning reason category is correctly stored and returned
    TestValidator.equals(
      `retrieved warning ${i + 1} reason category`,
      retrievedWarning.warning_reason,
      violation.reason,
    );

    // Validate detailed explanations are preserved
    TestValidator.equals(
      `retrieved warning ${i + 1} details preserved`,
      retrievedWarning.warning_details,
      violation.details,
    );

    // Validate severity classification supports progressive discipline
    TestValidator.equals(
      `retrieved warning ${i + 1} severity classification`,
      retrievedWarning.severity,
      violation.severity,
    );

    // Validate complete warning data integrity
    TestValidator.equals(
      `retrieved warning ${i + 1} ID matches`,
      retrievedWarning.id,
      createdWarning.id,
    );
    TestValidator.equals(
      `retrieved warning ${i + 1} member ID matches`,
      retrievedWarning.discussion_board_member_id,
      member.id,
    );
    TestValidator.equals(
      `retrieved warning ${i + 1} moderator ID matches`,
      retrievedWarning.discussion_board_moderator_id,
      moderator.id,
    );
  }
}
