import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

/**
 * Test scenario for permanent deletion of a discussion board administrator
 * account.
 *
 * The test performs the following steps:
 *
 * 1. Register a new admin account using /auth/admin/join.
 * 2. Validate the received authorized admin information including tokens.
 * 3. Delete the registered admin account by ID using the DELETE endpoint.
 * 4. Attempt to delete a non-existing admin to validate error handling.
 * 5. Confirm that deletion requires proper admin authorization.
 * 6. Validate that the admin's sessions and data are removed completely.
 */
export async function test_api_discussion_board_admins_delete_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register new admin account
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const createdAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(createdAdmin);

  // Step 2: Validate admin creation
  typia.assert<string & tags.Format<"uuid">>(createdAdmin.id);
  TestValidator.equals(
    "admin email matches input",
    createdAdmin.email,
    adminJoinBody.email,
  );

  // Step 3: Attempt deletion without proper authorization
  // Create unauthenticated connection (empty headers) to test auth enforcement
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.discussionBoard.admin.discussionBoardAdmins.erase(
      unauthConn,
      { discussionBoardAdminId: createdAdmin.id },
    );
  });

  // Step 4: Delete the created admin with proper authorization
  await api.functional.discussionBoard.admin.discussionBoardAdmins.erase(
    connection,
    {
      discussionBoardAdminId: createdAdmin.id,
    },
  );

  // Step 5: Attempt to delete a non-existing admin (expect error)
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existing admin throws error",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardAdmins.erase(
        connection,
        {
          discussionBoardAdminId: invalidId,
        },
      );
    },
  );

  // Step 6: Validate that all sessions of the deleted admin are removed
  // Since no API provided to query sessions, this step is logically skipped
  // This comment exists to indicate the intention per scenario requirements
}
