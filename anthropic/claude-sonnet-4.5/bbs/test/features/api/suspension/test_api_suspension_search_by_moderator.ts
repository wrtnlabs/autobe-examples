import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test searching and retrieving user suspensions filtered by the moderator who
 * issued them.
 *
 * This test validates the complete workflow of suspension search functionality:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a member account to be suspended
 * 3. Issue a suspension for the member
 * 4. Search for suspensions by the suspending moderator
 * 5. Verify the suspension appears in results with correct attribution and details
 */
export async function test_api_suspension_search_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account to be suspended
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass456!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create suspension for the member
  const suspensionData = {
    discussion_board_member_id: member.id,
    suspension_reason: "Repeated policy violations",
    suspension_details:
      "User has violated community guidelines multiple times including spam and harassment.",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IDiscussionBoardUserSuspension.ICreate;

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Step 4: Search for suspensions by the suspending moderator
  const searchRequest = {
    suspending_moderator_id: moderator.id,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardUserSuspension.IRequest;

  const searchResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResults);

  // Step 5: Verify suspension appears in results with correct details
  TestValidator.predicate(
    "search results should contain at least one suspension",
    searchResults.data.length > 0,
  );

  const foundSuspension = searchResults.data.find(
    (s) => s.id === suspension.id,
  );

  if (foundSuspension) {
    typia.assertGuard(foundSuspension);

    TestValidator.equals(
      "suspension ID matches",
      foundSuspension.id,
      suspension.id,
    );

    TestValidator.equals(
      "suspended user ID matches",
      foundSuspension.suspended_user.id,
      member.id,
    );

    TestValidator.equals(
      "suspending moderator ID matches",
      foundSuspension.suspending_moderator.id,
      moderator.id,
    );

    TestValidator.equals(
      "suspension reason matches",
      foundSuspension.suspension_reason,
      suspensionData.suspension_reason,
    );

    TestValidator.predicate(
      "suspension has valid created timestamp",
      new Date(foundSuspension.created_at).getTime() > 0,
    );

    TestValidator.predicate(
      "suspension has valid suspended_at timestamp",
      new Date(foundSuspension.suspended_at).getTime() > 0,
    );

    if (foundSuspension.expires_at !== null) {
      TestValidator.predicate(
        "expiration date is in the future",
        new Date(foundSuspension.expires_at).getTime() > Date.now(),
      );
    }
  }
}
