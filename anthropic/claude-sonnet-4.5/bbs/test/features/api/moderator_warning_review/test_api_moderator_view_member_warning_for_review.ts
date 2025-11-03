import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";

export async function test_api_moderator_view_member_warning_for_review(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account who will issue the warning
  const issuingModeratorEmail = typia.random<string & tags.Format<"email">>();
  const issuingModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: issuingModeratorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(issuingModerator);

  // Step 2: Create second moderator account who will review the warning
  const reviewingModeratorEmail = typia.random<string & tags.Format<"email">>();
  const reviewingModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: reviewingModeratorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(reviewingModerator);

  // Step 3: Create a member account who will receive the warning
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Switch back to first moderator context (already authenticated)
  connection.headers = {};
  connection.headers.Authorization = issuingModerator.token.access;

  // Step 4: First moderator issues a warning to the member
  const severityOptions = ["minor", "moderate", "severe"] as const;
  const warning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: "spam",
          warning_details:
            "Posted promotional content multiple times in violation of community guidelines. Please refrain from advertising products or services in discussion threads.",
          severity: RandomGenerator.pick(severityOptions),
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warning);

  // Switch to second moderator (reviewer) context
  connection.headers = {};
  connection.headers.Authorization = reviewingModerator.token.access;

  // Step 5: Second moderator retrieves the warning details for review
  const retrievedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.member.moderation.warnings.at(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(retrievedWarning);

  // Step 6: Validate the response includes complete context
  TestValidator.equals("warning ID matches", retrievedWarning.id, warning.id);
  TestValidator.equals(
    "warned member ID matches",
    retrievedWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "warning reason matches",
    retrievedWarning.warning_reason,
    warning.warning_reason,
  );
  TestValidator.equals(
    "warning details match",
    retrievedWarning.warning_details,
    warning.warning_details,
  );
  TestValidator.equals(
    "severity level matches",
    retrievedWarning.severity,
    warning.severity,
  );

  // Step 7: Verify warned member information is included
  TestValidator.predicate(
    "warned user information exists",
    retrievedWarning.warnedUser !== null &&
      retrievedWarning.warnedUser !== undefined,
  );
  TestValidator.equals(
    "warned user ID matches",
    retrievedWarning.warnedUser.id,
    member.id,
  );

  // Step 8: Verify issuing moderator information is included
  TestValidator.predicate(
    "issuing moderator information exists",
    retrievedWarning.issuingModerator !== null &&
      retrievedWarning.issuingModerator !== undefined,
  );

  // Step 9: Validate comprehensive view for informed enforcement decisions
  TestValidator.predicate(
    "warning has creation timestamp",
    retrievedWarning.created_at !== null &&
      retrievedWarning.created_at !== undefined,
  );
  TestValidator.predicate(
    "warning has update timestamp",
    retrievedWarning.updated_at !== null &&
      retrievedWarning.updated_at !== undefined,
  );
}
