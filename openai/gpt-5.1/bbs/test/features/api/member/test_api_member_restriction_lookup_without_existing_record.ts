import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

/**
 * Validate restriction lookup for a freshly joined member user.
 *
 * Business goal: Ensure that when a new discussion-board member user who has
 * just joined the system (and therefore should have no explicit restriction row
 * yet) queries their own restriction status via the memberUser-facing
 * restriction endpoint, the API behaves in a stable, self-consistent way and
 * does not leak another user’s data.
 *
 * Test flow:
 *
 * 1. Join as a new member user using POST /auth/memberUser/join, providing a fully
 *    valid IDiscussionBoardMemberUserJoin.IRequest payload.
 *
 *    - Capture the returned IDiscussionBoardMemberuser.IAuthorized structure.
 *    - Rely on the SDK’s side effect that sets connection.headers.Authorization to
 *         the member’s access token.
 * 2. Immediately call GET
 *    /discussionBoard/memberUser/memberUsers/{memberUserId}/restriction using
 *    api.functional.discussionBoard.memberUser.memberUsers.restriction.at with
 *    memberUserId equal to the newly joined member’s id, and the same
 *    connection.
 * 3. Assert that the call succeeds and returns a payload compatible with
 *    IDiscussionBoardMemberuserRestriction via typia.assert.
 * 4. Check that the restriction.memberUser.id equals the authenticated member’s
 *    id, ensuring that the endpoint does not leak another user’s restriction
 *    record even if some bug or misconfiguration exists.
 * 5. Perform a couple of light business sanity checks on the returned restriction
 *    (for example, non-empty restriction_level and reason_category) without
 *    re-validating types already covered by typia.assert.
 */
export async function test_api_member_restriction_lookup_without_existing_record(
  connection: api.IConnection,
) {
  // 1. Join as a new member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const authorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  const memberId = authorized.id;

  // 2. Call restriction lookup for the same member user
  const restriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.memberUser.memberUsers.restriction.at(
      connection,
      { memberUserId: memberId },
    );
  typia.assert(restriction);

  // 3. Basic identity consistency: restriction belongs to the same member
  TestValidator.equals(
    "restriction.memberUser.id must match authenticated member id",
    restriction.memberUser.id,
    memberId,
  );

  // 4. Light business sanity checks (no extra type validation)
  TestValidator.predicate(
    "restriction_level should not be empty",
    restriction.restriction_level.length > 0,
  );

  TestValidator.predicate(
    "reason_category should not be empty",
    restriction.reason_category.length > 0,
  );
}
