import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";

export async function test_api_warning_update_correction_after_review(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorEmail = `mod_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: "SecurePass123!",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account that will be warned
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "MemberPass123!",
        href: "https://example.com/member/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // Step 3: Issue initial warning with incorrect assessment (harassment)
  const initialWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: "harassment",
          warning_details:
            "Initial assessment: User engaged in harassing behavior towards another member. This appears to be targeted personal attacks.",
          severity: "moderate",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(initialWarning);

  // Step 4: Update warning to correct the assessment (change to spam)
  const updatedWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.update(
      connection,
      {
        warningId: initialWarning.id,
        body: {
          warning_reason: "spam",
          warning_details:
            "Corrected assessment: Upon review, the behavior was actually repetitive spam posting rather than harassment. The user posted the same promotional content multiple times across different discussion threads.",
          severity: "moderate",
        } satisfies IDiscussionBoardUserWarning.IUpdate,
      },
    );
  typia.assert(updatedWarning);

  // Step 5: Verify warning reason changed correctly
  TestValidator.equals(
    "warning reason should be updated to spam",
    updatedWarning.warning_reason,
    "spam",
  );

  // Step 6: Verify detailed explanation was updated
  TestValidator.predicate(
    "warning details should contain corrected assessment",
    updatedWarning.warning_details.includes("Corrected assessment"),
  );
  TestValidator.predicate(
    "warning details should mention spam posting",
    updatedWarning.warning_details.includes("spam posting"),
  );

  // Step 7: Verify metadata remains intact
  TestValidator.equals(
    "warning ID should remain unchanged",
    updatedWarning.id,
    initialWarning.id,
  );
  TestValidator.equals(
    "warned member should remain the same",
    updatedWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "issuing moderator should remain the same",
    updatedWarning.discussion_board_moderator_id,
    moderator.id,
  );

  // Step 8: Verify audit trail with distinct timestamps
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedWarning.created_at,
    initialWarning.created_at,
  );
  TestValidator.predicate(
    "updated_at should be different from created_at",
    updatedWarning.updated_at !== updatedWarning.created_at,
  );
}
