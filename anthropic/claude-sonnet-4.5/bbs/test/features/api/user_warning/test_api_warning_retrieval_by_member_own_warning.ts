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
 * Test that a member can retrieve their own warning details for transparency.
 *
 * This test validates the complete workflow of warning issuance and retrieval:
 *
 * 1. Create member account that will receive warning
 * 2. Create moderator account to issue warning
 * 3. Moderator issues warning to member with violation details
 * 4. Member retrieves warning details (using existing auth context)
 * 5. Validate complete warning information is accessible
 */
export async function test_api_warning_retrieval_by_member_own_warning(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will receive the warning
  const memberBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // Step 2: Create moderator account to issue the warning
  const moderatorBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorBody,
  });
  typia.assert(moderator);

  // Step 3: Moderator issues warning to the member
  const warningBody = {
    discussion_board_member_id: member.id,
    warning_reason: "inappropriate language",
    warning_details:
      "Your comment contained language that violates our community guidelines. Please ensure future discussions remain respectful and professional.",
    severity: "moderate",
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const issuedWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: warningBody,
      },
    );
  typia.assert(issuedWarning);

  // Step 4: Retrieve the warning (API supports both moderator and member access)
  const retrievedWarning =
    await api.functional.discussionBoard.moderation.warnings.at(connection, {
      warningId: issuedWarning.id,
    });
  typia.assert(retrievedWarning);

  // Step 5: Validate that warning details are complete and accessible
  TestValidator.equals(
    "retrieved warning ID matches issued warning",
    retrievedWarning.id,
    issuedWarning.id,
  );

  TestValidator.equals(
    "warning belongs to the correct member",
    retrievedWarning.discussion_board_member_id,
    member.id,
  );

  // Step 6: Verify violation details are complete
  TestValidator.equals(
    "warning reason is accessible",
    retrievedWarning.warning_reason,
    "inappropriate language",
  );

  TestValidator.equals(
    "warning details explanation is present",
    retrievedWarning.warning_details,
    warningBody.warning_details,
  );

  // Step 7: Validate severity level is visible
  TestValidator.equals(
    "severity level is visible",
    retrievedWarning.severity,
    "moderate",
  );

  // Validate issuing moderator reference
  TestValidator.equals(
    "issuing moderator ID is correct",
    retrievedWarning.discussion_board_moderator_id,
    moderator.id,
  );

  // Validate member and moderator summary objects are present
  TestValidator.equals(
    "warned user username matches",
    retrievedWarning.warnedUser.username,
    member.username,
  );

  TestValidator.equals(
    "issuing moderator username matches",
    retrievedWarning.issuingModerator.username,
    moderator.username,
  );
}
