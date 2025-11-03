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
 * Test retrieving warning details that include acknowledgment status
 * information.
 *
 * This test validates that the warning retrieval shows whether the member has
 * acknowledged receipt of the warning. The workflow proceeds as follows:
 *
 * 1. Create a moderator account via join for issuing warnings
 * 2. Create a member account via join who will receive the warning
 * 3. Moderator issues a warning to the member
 * 4. Retrieve the warning details immediately after issuance
 * 5. Validate the warning shows acknowledgment status (initially unacknowledged)
 * 6. Verify the response includes timestamps for when the warning was issued and
 *    when acknowledged (null if not acknowledged)
 * 7. Validate the complete warning metadata supports tracking member response to
 *    warnings
 *
 * This test validates that warning details include acknowledgment tracking
 * information, the system records whether members have acknowledged warnings,
 * timestamps show both issuance and acknowledgment times, and moderators can
 * see if members have reviewed their warnings for compliance tracking.
 */
export async function test_api_warning_details_with_acknowledgment_status(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account who will issue the warning
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a member account who will receive the warning
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 3: Create member record in the system (required before warning can be issued)
  const memberRecord: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberRecord);

  // Step 4: Moderator issues a warning to the member
  const warningReason = "harassment";
  const warningDetails =
    "Posted aggressive comments targeting other members in the economics discussion thread. Please maintain respectful discourse focused on ideas rather than personal attacks.";
  const severity = RandomGenerator.pick([
    "minor",
    "moderate",
    "severe",
  ] as const);

  const issuedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberRecord.id,
          warning_reason: warningReason,
          warning_details: warningDetails,
          severity: severity,
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(issuedWarning);

  // Step 5: Retrieve the warning details immediately after issuance
  const retrievedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.member.moderation.warnings.at(
      connection,
      {
        warningId: issuedWarning.id,
      },
    );
  typia.assert(retrievedWarning);

  // Step 6: Validate the warning shows acknowledgment status (initially unacknowledged)
  TestValidator.equals(
    "warning ID matches issued warning",
    retrievedWarning.id,
    issuedWarning.id,
  );

  TestValidator.equals(
    "warning reason matches",
    retrievedWarning.warning_reason,
    warningReason,
  );

  TestValidator.equals(
    "warning details match",
    retrievedWarning.warning_details,
    warningDetails,
  );

  TestValidator.equals(
    "severity level matches",
    retrievedWarning.severity,
    severity,
  );

  // Step 7: Verify acknowledged_at is null (member hasn't acknowledged yet)
  TestValidator.equals(
    "acknowledgment status is null initially",
    retrievedWarning.acknowledged_at,
    null,
  );

  // Step 8: Verify timestamps for warning issuance exist
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedWarning.created_at !== null &&
      retrievedWarning.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedWarning.updated_at !== null &&
      retrievedWarning.updated_at !== undefined,
  );

  // Step 9: Validate member and moderator information is present
  TestValidator.equals(
    "warned member ID matches",
    retrievedWarning.warnedUser.id,
    memberRecord.id,
  );

  TestValidator.equals(
    "issuing moderator ID matches",
    retrievedWarning.issuingModerator.id,
    moderator.id,
  );

  // Step 10: Verify deleted_at is null (warning is active)
  TestValidator.equals(
    "warning is not deleted",
    retrievedWarning.deleted_at,
    null,
  );
}
