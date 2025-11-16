import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Verify that the admin user deletion endpoint enforces adminUser
 * authentication.
 *
 * Business goals:
 *
 * - Anonymous (unauthenticated) callers must not be able to delete admin users.
 * - Authenticated adminUser actors are allowed to delete other admin accounts.
 * - Demonstrate both failure and success flows in a single scenario without
 *   touching connection.headers directly or inspecting raw HTTP status codes.
 *
 * High level flow:
 *
 * 1. Create Admin A via POST /auth/adminUser/join (authorized context A).
 * 2. Create Admin B via POST /auth/adminUser/join (authorized context B), but we
 *    only need B’s username as the deletion target.
 * 3. Simulate an unauthenticated connection by cloning the original connection but
 *    assigning an empty headers object (never mutating the original
 *    connection’s headers).
 * 4. Using the unauthenticated connection, attempt to call DELETE
 *    /communityPlatform/adminUser/adminUsers/{username} for Admin B and assert
 *    that the call fails using TestValidator.error. We do not check status
 *    codes, only that an error occurs.
 * 5. Using an authenticated adminUser connection (re-joining as Admin A to ensure
 *    the connection is in an authenticated adminUser context), invoke the same
 *    DELETE endpoint for Admin B and assert that the call succeeds (no error is
 *    thrown).
 *
 * Implementation and type usage notes:
 *
 * - Use api.functional.auth.adminUser.join with
 *   ICommunityPlatformAdminUserJoin.IRequest for admin creation, and
 *   ICommunityPlatformAdminuser.IAuthorized as response.
 * - The join() SDK call automatically sets connection.headers.Authorization to
 *   the issued access token for that connection; we rely on that behavior and
 *   never set or read headers manually.
 * - To simulate an unauthenticated call, create a shallow-copied connection
 *   object with headers: {} and pass it into the erase() call. Do not touch
 *   connection.headers on the original connection object at all.
 * - For the DELETE operation, use
 *   api.functional.communityPlatform.adminUser.adminUsers.erase with the
 *   concrete username string from Admin B.
 * - We only validate that the first erase call throws and the second does not; we
 *   do not validate HTTP codes, error bodies, or low-level details.
 */
export async function test_api_admin_user_deletion_access_control_enforcement(
  connection: api.IConnection,
) {
  // 1. Register Admin A who will perform authenticated deletion.
  const adminAPassword = typia.random<string & tags.Format<"password">>();

  const adminARequestBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: adminAPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminARequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  // 2. Register Admin B who will be the deletion target.
  const adminBPassword = typia.random<string & tags.Format<"password">>();

  const adminBRequestBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: adminBPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBRequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminB);

  // 3. Prepare an unauthenticated connection clone.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Anonymous deletion attempt: must fail.
  await TestValidator.error(
    "anonymous admin user deletion must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.erase(
        unauthenticatedConnection,
        {
          username: adminB.username,
        },
      );
    },
  );

  // 5. Authenticated deletion by an adminUser: must succeed.
  // Re-authenticate as Admin A (using the same credentials) to ensure the
  // connection is in an authenticated adminUser context before deletion.
  const reAuthAdminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminARequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(reAuthAdminA);

  await api.functional.communityPlatform.adminUser.adminUsers.erase(
    connection,
    {
      username: adminB.username,
    },
  );
}
