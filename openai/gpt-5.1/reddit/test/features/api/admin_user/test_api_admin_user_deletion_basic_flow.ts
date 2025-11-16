import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Basic happy-path test for deleting an admin user by username.
 *
 * Business goal
 *
 * - Ensure that an authenticated adminUser actor can successfully invoke DELETE
 *   /communityPlatform/adminUser/adminUsers/{username} for an existing admin
 *   account and that the operation completes without error.
 *
 * Covered behaviors
 *
 * 1. Admin creation via POST /auth/adminUser/join (Admin A and Admin B).
 * 2. Authorized deletion of Admin B by username via erase endpoint.
 * 3. Continued usability of the connection after deletion (by performing another
 *    join call) to ensure that auth state is still valid.
 *
 * Notes and limitations
 *
 * - We do not verify HTTP status codes or type-error scenarios.
 * - We do not verify retrieval after deletion because no GET-by-username API is
 *   provided in the materials.
 * - Because the SDK automatically updates `connection.headers.Authorization` on
 *   each successful join, the actual caller of the erase endpoint will be the
 *   _last_ joined adminUser (Admin B in this flow). This still satisfies the
 *   requirement that some authenticated adminUser can perform deletion.
 */
export async function test_api_admin_user_deletion_basic_flow(
  connection: api.IConnection,
) {
  // 1. Create Admin A via join
  const adminARequest = {
    username: `admin-a-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminARequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  TestValidator.equals(
    "admin A username should match request",
    adminA.username,
    adminARequest.username,
  );

  // 2. Create Admin B (target of deletion)
  const adminBRequest = {
    username: `admin-b-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminB);

  TestValidator.equals(
    "admin B username should match request",
    adminB.username,
    adminBRequest.username,
  );

  TestValidator.notEquals(
    "admin A and admin B usernames should differ",
    adminA.username,
    adminB.username,
  );

  // 3. Perform deletion of Admin B by username
  TestValidator.equals(
    "username passed to erase matches admin B username",
    adminB.username,
    adminBRequest.username,
  );

  await api.functional.communityPlatform.adminUser.adminUsers.erase(
    connection,
    {
      username: adminB.username,
    },
  );

  // 4. Connection remains usable after deletion: perform another join
  const adminCRequest = {
    username: `admin-c-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminC: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminCRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminC);

  TestValidator.equals(
    "admin C username should match request",
    adminC.username,
    adminCRequest.username,
  );
}
