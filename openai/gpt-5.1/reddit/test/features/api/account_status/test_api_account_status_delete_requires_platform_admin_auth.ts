import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure account status deletion requires platform admin authentication.
 *
 * Business goal:
 *
 * - Verify that DELETE
 *   /communityPlatform/platformAdmin/accountStatuses/{accountStatusId} cannot
 *   be invoked anonymously.
 * - Confirm that, when authenticated as a platform admin created via
 *   /auth/platformAdmin/join, the same endpoint successfully deletes the target
 *   account status.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator using auth.platformAdmin.join, letting
 *    the SDK attach the issued access token into the shared connection
 *    headers.
 * 2. With the authenticated platform admin connection, create a fresh account
 *    status via communityPlatform.platformAdmin.accountStatuses.create and
 *    capture its id.
 * 3. Derive an unauthenticated connection by cloning the base connection but
 *    clearing its headers object, so that no Authorization header is sent.
 *    Using this unauthenticated connection, attempt to delete the account
 *    status and assert that an HTTP authorization/authentication error is
 *    raised (401/403 style), using TestValidator.httpError.
 * 4. Using the original authenticated platform admin connection (which still
 *    carries the Authorization header from step 1), call erase again for the
 *    same id and assert that it succeeds (no error is thrown).
 *
 * This test focuses strictly on the access-control behavior of the delete
 * endpoint. Non-admin actors (memberUser / communityModerator) are not
 * exercised here because no such authentication SDK functions are provided in
 * the materials, and the priority is to validate anonymous vs platformAdmin
 * access while keeping the code fully compilable.
 */
export async function test_api_account_status_delete_requires_platform_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated connection
  const joinInput = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinInput,
    });
  typia.assert(admin);

  // 2. Create a new account status as the authenticated platform admin
  const statusCreateBody =
    typia.random<ICommunityPlatformAccountStatus.ICreate>();
  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Attempt deletion without any Authorization header
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "anonymous delete of account status must be rejected",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.platformAdmin.accountStatuses.erase(
        unauthenticated,
        {
          accountStatusId: createdStatus.id,
        },
      );
    },
  );

  // 4. Delete with proper platform admin authentication (should succeed)
  await api.functional.communityPlatform.platformAdmin.accountStatuses.erase(
    connection,
    {
      accountStatusId: createdStatus.id,
    },
  );
}
