import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

export async function test_api_admin_account_erasure_process(
  connection: api.IConnection,
) {
  // 1. Create a new admin user (join)
  const adminCreateBody = {
    email: `admin${Date.now()}@example.com`,
    password: "StrongPass123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const createdAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(createdAdmin);

  // 2. Login using the created admin credentials
  const loginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IRedditCommunityAdmin.ILogin;
  const loggedInAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loggedInAdmin);

  // 3. Attempt unauthorized deletion (expect failure)
  // For unauthorized attempt, create a fresh connection without headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized deletion should be rejected",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityAdmins.erase(
        unauthConn,
        {
          id: createdAdmin.id,
        },
      );
    },
  );

  // 4. Delete the admin account with proper authentication
  // The connection 'connection' is already authenticated with the new token
  await api.functional.redditCommunity.admin.redditCommunityAdmins.erase(
    connection,
    {
      id: createdAdmin.id,
    },
  );

  // 5. Attempt to delete the same admin again (should error - no such user)
  await TestValidator.error(
    "deleting non-existent admin should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityAdmins.erase(
        connection,
        {
          id: createdAdmin.id,
        },
      );
    },
  );

  // 6. Attempt to login with deleted admin credentials to ensure it fails
  await TestValidator.error(
    "login with deleted admin should fail",
    async () => {
      await api.functional.auth.admin.login(connection, { body: loginBody });
    },
  );
}
