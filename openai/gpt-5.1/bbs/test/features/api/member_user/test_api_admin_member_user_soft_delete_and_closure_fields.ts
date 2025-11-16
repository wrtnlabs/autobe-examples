import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that an admin user can soft-delete and administratively close a
 * discussion board member account.
 *
 * Business context:
 *
 * - Member users register via the public member join endpoint and receive JWT
 *   tokens plus basic profile and lifecycle fields.
 * - Admin users register via the admin join endpoint and receive adminUser JWT
 *   tokens used to authenticate against admin-only management APIs.
 * - Admins can manage member lifecycle and moderation states using
 *   /discussionBoard/adminUser/memberUsers/{memberUserId}.
 *
 * This test focuses on the positive path where an administrator:
 *
 * 1. Creates a new member user account.
 * 2. Creates a new admin user account, activating adminUser authentication on the
 *    shared connection.
 * 3. Uses the admin-only memberUsers.update endpoint to set soft deletion and
 *    closure related lifecycle fields on the member:
 *
 *    - Deleted_at: non-null timestamp (logical deletion)
 *    - Closed_at: non-null timestamp (closure time)
 *    - Closed_by_admin: true (administratively closed)
 *    - Account_status: a non-active value (e.g., "banned")
 * 4. Verifies that the returned IDiscussionBoardMemberuser reflects these
 *    lifecycle changes while preserving the original member id.
 *
 * Negative access-control scenarios (anonymous or member-authenticated access
 * to this endpoint) are covered in other tests and are not part of this
 * function.
 */
export async function test_api_admin_member_user_soft_delete_and_closure_fields(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain a memberUserId
  const memberJoinBody =
    typia.random<IDiscussionBoardMemberUserJoin.IRequest>();

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a new admin user, which also sets admin Authorization header
  const adminJoinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Sanity checks on join responses
  TestValidator.predicate(
    "member id should be a non-empty UUID string",
    (memberAuthorized.id?.length ?? 0) > 0,
  );
  TestValidator.predicate(
    "admin id should be a non-empty UUID string",
    (adminAuthorized.id?.length ?? 0) > 0,
  );

  // 3. Admin performs lifecycle update on the member account
  const nowIso: string = new Date().toISOString();
  const closedStatus = "banned";

  const updateBody = {
    deleted_at: nowIso,
    closed_at: nowIso,
    closed_by_admin: true,
    account_status: closedStatus,
  } satisfies IDiscussionBoardMemberuser.IUpdate;

  const updatedMember: IDiscussionBoardMemberuser =
    await api.functional.discussionBoard.adminUser.memberUsers.update(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // 4. Validate lifecycle updates and identity preservation
  TestValidator.equals(
    "updated member id should match original member id",
    updatedMember.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "updated member account_status should reflect closed/banned state",
    updatedMember.account_status,
    closedStatus,
  );

  TestValidator.predicate(
    "updated member deleted_at should be non-null",
    updatedMember.deleted_at !== null && updatedMember.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "updated member closed_at should be non-null",
    updatedMember.closed_at !== null && updatedMember.closed_at !== undefined,
  );

  TestValidator.equals(
    "updated member closed_by_admin should be true",
    updatedMember.closed_by_admin,
    true,
  );
}
