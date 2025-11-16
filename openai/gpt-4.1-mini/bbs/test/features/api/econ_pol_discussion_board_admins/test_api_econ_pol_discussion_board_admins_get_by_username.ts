import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";

export async function test_api_econ_pol_discussion_board_admins_get_by_username(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to get auth token
  const authAdminJoinBody: IEconPolDiscussionBoardAdmin.IJoin = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(5)}@${RandomGenerator.alphabets(4)}.com`,
    password: RandomGenerator.alphaNumeric(12),
  };
  const authAdminAuthorized: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: authAdminJoinBody,
    });
  typia.assert(authAdminAuthorized);

  // 2. Create admin account using the authenticated admin context
  // Prepare create body
  const createAdminBody: IEconPolDiscussionBoardAdmin.ICreate = {
    adminUsername: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(6)}@${RandomGenerator.alphabets(4)}.org`,
    password: RandomGenerator.alphaNumeric(12),
    role: "admin",
  };
  const createdAdmin: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
      connection,
      {
        body: createAdminBody,
      },
    );
  typia.assert(createdAdmin);

  // 3. Authenticate again as admin for authorization (per dependency requirement)
  // Using same authAdminJoinBody is fine according to dependencies
  const authAdminAgain: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: authAdminJoinBody,
    });
  typia.assert(authAdminAgain);

  // 4. Retrieve the detailed admin information by username
  const retrievedAdmin: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.at(
      connection,
      {
        adminUsername: createAdminBody.adminUsername,
      },
    );
  typia.assert(retrievedAdmin);

  // Validate that retrieved admin matches created admin details
  TestValidator.equals(
    "admin usernames should match",
    retrievedAdmin.adminUsername,
    createdAdmin.adminUsername,
  );
  TestValidator.equals(
    "admin emails should match",
    retrievedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "admin role should be admin",
    retrievedAdmin.role,
    createAdminBody.role,
  );
  TestValidator.predicate(
    "admin is active status",
    retrievedAdmin.is_active === true || retrievedAdmin.is_active === false,
  );
}
