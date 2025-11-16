import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

/**
 * Validate that an admin user can create and then delete a restriction for a
 * specific member user, and that after deletion a new restriction can be
 * created again for the same member user.
 *
 * Business context:
 *
 * - Discussion_board_memberuser_restrictions holds at most one active restriction
 *   row per member user, keyed by discussion_board_memberuser_id.
 * - The admin-only create endpoint establishes the restriction.
 * - The admin-only erase endpoint hard-deletes the restriction row to lift the
 *   restriction.
 *
 * This test ensures:
 *
 * 1. Admin join correctly authenticates the connection and returns an
 *    IDiscussionBoardAdminuser.IAuthorized payload.
 * 2. Admin can create a restriction for a target member user using the create
 *    endpoint and IDiscussionBoardMemberuserRestriction.ICreate body.
 * 3. Admin can then erase that restriction via the erase endpoint without error.
 * 4. After erase, the admin can create another restriction for the same member
 *    user, which implicitly confirms the original restriction record was
 *    removed (because the create endpoint enforces one row per member user).
 */
export async function test_api_admin_member_user_restriction_delete_after_creation(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates admin user and authenticates connection)
  const adminJoinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a target member user id
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create initial restriction for the member user
  const createBodyFirst =
    typia.random<IDiscussionBoardMemberuserRestriction.ICreate>();

  const firstRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId,
        body: createBodyFirst,
      },
    );
  typia.assert(firstRestriction);

  // Sanity checks on returned restriction
  TestValidator.equals(
    "restriction memberUser.id matches path memberUserId (first)",
    firstRestriction.memberUser.id,
    memberUserId,
  );

  // 4. Erase the restriction for that member user
  await api.functional.discussionBoard.adminUser.memberUsers.restriction.erase(
    connection,
    {
      memberUserId,
    },
  );

  // 5. Create a new restriction again for the same member user
  const createBodySecond =
    typia.random<IDiscussionBoardMemberuserRestriction.ICreate>();

  const secondRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId,
        body: createBodySecond,
      },
    );
  typia.assert(secondRestriction);

  // Validate that the new restriction is associated with the same member user
  TestValidator.equals(
    "restriction memberUser.id matches path memberUserId (second)",
    secondRestriction.memberUser.id,
    memberUserId,
  );

  // Ensure that the second restriction is a different record than the first
  TestValidator.notEquals(
    "second restriction id differs from first",
    secondRestriction.id,
    firstRestriction.id,
  );
}
