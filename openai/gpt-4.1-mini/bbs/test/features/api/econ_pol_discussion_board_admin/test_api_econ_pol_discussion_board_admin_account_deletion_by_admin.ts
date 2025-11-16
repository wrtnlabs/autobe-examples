import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";

/**
 * Tests that an administrator account can be deleted by username.
 *
 * The test:
 *
 * 1. Registers an admin account using /auth/admin/join
 * 2. Creates an admin account via
 *    /econPolDiscussionBoard/admin/econPolDiscussionBoardAdmins
 * 3. Deletes the admin account by username via DELETE
 *    /econPolDiscussionBoard/admin/econPolDiscussionBoardAdmins/{adminUsername}
 * 4. Validates the deletion was successful and the account no longer exists
 */
export async function test_api_econ_pol_discussion_board_admin_account_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Join an admin actor (authentication & token issuance)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;
  const joined: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Create an administrator account for testing deletion
  // Use some of the joined data, but reset password and role
  const createBody = {
    adminUsername: joined.adminUsername,
    email: joined.email,
    password: RandomGenerator.alphaNumeric(12),
    role: "admin",
  } satisfies IEconPolDiscussionBoardAdmin.ICreate;

  const created: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "created admin username matches",
    createBody.adminUsername,
    created.adminUsername,
  );

  // 3. Delete the created admin account by username
  await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.erase(
    connection,
    { adminUsername: created.adminUsername },
  );

  // 4. Validation
  // Because no direct get endpoint exists, rely on error detection via re-delete
  await TestValidator.error(
    "admin account should be deleted and no longer removable",
    async () => {
      await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.erase(
        connection,
        { adminUsername: created.adminUsername },
      );
    },
  );
}
