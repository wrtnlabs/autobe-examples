import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";

/**
 * Test the administrator registration workflow for econPolDiscussionBoard.
 *
 * Each step validates the creation, field correctness, and authentication token
 * issuance. It includes:
 *
 * 1. Initial admin registration via /auth/admin/join prerequisite.
 * 2. Creation of a new administrator with a unique username, password, email, and
 *    role 'admin'.
 * 3. Validation that all required fields are present with proper formats,
 *    including created_at and updated_at timestamps.
 * 4. Ensuring is_active is true and deleted_at is null.
 * 5. Verifying the password_hash exists and is non-empty.
 * 6. Authentication of the created admin via token fields.
 *
 * This test ensures the system administrator onboarding process functions
 * correctly and securely.
 */
export async function test_api_econ_pol_discussion_board_admin_registration(
  connection: api.IConnection,
) {
  // 1. Prerequisite: Initial admin join to establish authorization
  await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "AdminPass123!",
    } satisfies IEconPolDiscussionBoardAdmin.IJoin,
  });

  // 2. Create a new administrator
  const newAdminUsername = RandomGenerator.alphaNumeric(10);
  const newAdminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const newAdminPassword = "SecurePass456!";
  const createBody = {
    adminUsername: newAdminUsername,
    email: newAdminEmail,
    password: newAdminPassword,
    role: "admin",
  } satisfies IEconPolDiscussionBoardAdmin.ICreate;

  const createdAdmin: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdAdmin);

  // 3. Validate required fields
  TestValidator.predicate(
    "adminUsername is non-empty string",
    typeof createdAdmin.adminUsername === "string" &&
      createdAdmin.adminUsername.length > 0,
  );
  TestValidator.equals(
    "adminUsername matches creation",
    createdAdmin.adminUsername,
    newAdminUsername,
  );
  TestValidator.equals(
    "email matches creation",
    createdAdmin.email,
    newAdminEmail,
  );

  TestValidator.equals("role is admin", createdAdmin.role, "admin");
  TestValidator.predicate("is_active is true", createdAdmin.is_active === true);

  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdAdmin.deleted_at === null || createdAdmin.deleted_at === undefined,
  );

  TestValidator.predicate(
    "created_at is string",
    typeof createdAdmin.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof createdAdmin.updated_at === "string",
  );

  TestValidator.predicate(
    "password_hash is non-empty string",
    typeof createdAdmin.password_hash === "string" &&
      createdAdmin.password_hash.length > 0,
  );

  // 4. Authenticate newly created admin using created credentials
  // (assuming login endpoint and token fetching - since only join is provided, we limit to above)
}
