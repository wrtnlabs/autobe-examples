import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving active account action for a member with no enforcement
 * actions.
 *
 * This test validates that the GET
 * /discussionBoard/moderator/members/{memberId}/accountActions/active endpoint
 * correctly returns null when querying a member who has no active enforcement
 * actions.
 *
 * Test workflow:
 *
 * 1. Authenticate as a moderator to gain necessary privileges
 * 2. Create a clean member account with no enforcement actions
 * 3. Call the active account action retrieval endpoint
 * 4. Verify that the response is null (no active enforcement)
 *
 * This validates the important use case where moderators check if a member is
 * in good standing before applying new enforcement actions, and ensures the
 * login workflow can properly determine account access eligibility.
 */
export async function test_api_account_action_active_retrieval_no_active_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to gain privileges for checking member enforcement status
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorPass123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://discussion.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion.example.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a clean member account with no enforcement actions
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    href: "https://discussion.example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion.example.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Retrieve the active account action for this member
  const activeAction: IDiscussionBoardAccountAction | null =
    await api.functional.discussionBoard.moderator.members.accountActions.active(
      connection,
      {
        memberId: member.id,
      },
    );

  // Step 4: Verify that the response is null (no active enforcement)
  TestValidator.equals(
    "member with no enforcement should have null active action",
    activeAction,
    null,
  );
}
