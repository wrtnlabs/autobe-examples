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
 * Test retrieving warnings with different severity levels to ensure severity
 * classification is properly stored and returned.
 *
 * This test validates that the warning system correctly handles multiple
 * severity levels (minor, moderate, severe). It creates a member and moderator
 * account, issues three warnings with different severities, then retrieves each
 * warning individually to verify the severity field, warning details, and
 * timestamps are correctly maintained.
 *
 * Test Flow:
 *
 * 1. Create member account to receive warnings
 * 2. Create moderator account to issue warnings
 * 3. Issue minor warning for first-time minor violation
 * 4. Issue moderate warning for repeated or more serious violation
 * 5. Issue severe warning for major guideline breach
 * 6. Retrieve and validate each warning individually
 */
export async function test_api_warning_retrieval_with_multiple_severity_levels(
  connection: api.IConnection,
) {
  // Step 1: Create member account to receive warnings
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account to issue warnings
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Issue minor warning for first-time minor violation
  const minorWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: "off-topic content",
          warning_details:
            "Your recent post was slightly off-topic. Please ensure future posts are relevant to economic and political discussions as per our community guidelines.",
          severity: "minor",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(minorWarning);

  // Step 4: Issue moderate warning for repeated or more serious violation
  const moderateWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: "disrespectful behavior",
          warning_details:
            "Your comments contained disrespectful language towards other community members. This behavior is not acceptable. Please maintain respectful discourse in all interactions.",
          severity: "moderate",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(moderateWarning);

  // Step 5: Issue severe warning for major guideline breach
  const severeWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: "harassment",
          warning_details:
            "You have engaged in harassment of another member through repeated personal attacks and threatening language. This is a serious violation of our community standards and will not be tolerated.",
          severity: "severe",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(severeWarning);

  // Step 6: Retrieve and validate minor warning
  const retrievedMinorWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.at(
      connection,
      {
        warningId: minorWarning.id,
      },
    );
  typia.assert(retrievedMinorWarning);

  TestValidator.equals(
    "minor warning severity should be minor",
    retrievedMinorWarning.severity,
    "minor",
  );
  TestValidator.equals(
    "minor warning reason matches",
    retrievedMinorWarning.warning_reason,
    "off-topic content",
  );
  TestValidator.predicate(
    "minor warning has valid created_at timestamp",
    retrievedMinorWarning.created_at !== null &&
      retrievedMinorWarning.created_at.length > 0,
  );

  // Step 7: Retrieve and validate moderate warning
  const retrievedModerateWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.at(
      connection,
      {
        warningId: moderateWarning.id,
      },
    );
  typia.assert(retrievedModerateWarning);

  TestValidator.equals(
    "moderate warning severity should be moderate",
    retrievedModerateWarning.severity,
    "moderate",
  );
  TestValidator.equals(
    "moderate warning reason matches",
    retrievedModerateWarning.warning_reason,
    "disrespectful behavior",
  );
  TestValidator.predicate(
    "moderate warning has valid created_at timestamp",
    retrievedModerateWarning.created_at !== null &&
      retrievedModerateWarning.created_at.length > 0,
  );

  // Step 8: Retrieve and validate severe warning
  const retrievedSevereWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.at(
      connection,
      {
        warningId: severeWarning.id,
      },
    );
  typia.assert(retrievedSevereWarning);

  TestValidator.equals(
    "severe warning severity should be severe",
    retrievedSevereWarning.severity,
    "severe",
  );
  TestValidator.equals(
    "severe warning reason matches",
    retrievedSevereWarning.warning_reason,
    "harassment",
  );
  TestValidator.predicate(
    "severe warning has valid created_at timestamp",
    retrievedSevereWarning.created_at !== null &&
      retrievedSevereWarning.created_at.length > 0,
  );
}
