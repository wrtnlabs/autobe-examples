import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test the update operation for discussion board admin users.
 *
 * This test covers the essential admin lifecycle: registration, login (to
 * obtain JWT tokens), and update. It ensures that an admin can modify their
 * email, password hash, and display name successfully.
 *
 * Steps:
 *
 * 1. Register a new admin user providing email, password, and displayName.
 * 2. Login using the same credentials to obtain an authorization token.
 * 3. Update the admin user's email, password_hash, and display_name using the
 *    update API.
 * 4. Verify that the response reflects the updated properties exactly.
 * 5. Verify the JWT token is present and valid in the initial login response.
 *
 * The test validates correct authentication flows, proper token handling, and
 * update operation effectiveness on the admin resource.
 */
export async function test_api_admin_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const joinedAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(joinedAdmin);

  // 2. Login as admin user
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IDiscussionBoardAdmin.ILogin;

  const loggedInAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. Prepare update body with new random but valid values
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    display_name: RandomGenerator.name(3),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IDiscussionBoardAdmin.IUpdate;

  // 4. Perform update call
  const updatedAdmin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.update(
      connection,
      {
        discussionBoardAdminId: joinedAdmin.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAdmin);

  // 5. Validate updated information matches the update body
  TestValidator.equals(
    "admin email should be updated",
    updatedAdmin.email,
    updateBody.email,
  );
  TestValidator.equals(
    "admin password_hash should be updated",
    updatedAdmin.password_hash,
    updateBody.password_hash,
  );
  TestValidator.equals(
    "admin display_name should be updated",
    updatedAdmin.display_name,
    updateBody.display_name,
  );
  TestValidator.equals(
    "admin updated_at should be updated",
    updatedAdmin.updated_at,
    updateBody.updated_at,
  );
  TestValidator.equals(
    "admin deleted_at should be null",
    updatedAdmin.deleted_at,
    null,
  );
}
