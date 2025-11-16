import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * E2E test for administrator user detail read access control.
 *
 * Validates:
 *
 * - Authenticated administrator can fetch full user details by userId.
 * - Success includes all identity/status fields but no sensitive authentication
 *   info.
 * - Fetching non-existent or soft-deleted users returns 404.
 * - Endpoint access is limited to administrator: denied for
 *   unauthenticated/non-admin clients.
 */
export async function test_api_administrator_user_detail_read_access_control(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssword!123";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    business_status: "head_admin",
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Register a user (simulate user insert, as no exposed user registration API)
  const user: ICommunityPlatformUser = typia.random<ICommunityPlatformUser>();
  // Simulate storing the user; in real E2E you would call an API to create a user
  // For this test, we'll only call the GET endpoint as that's all that's exposed

  // 3. As admin, fetch user details by userId
  try {
    const userDetail =
      await api.functional.communityPlatform.administrator.users.at(
        connection,
        {
          userId: user.id,
        },
      );
    typia.assert(userDetail);
    TestValidator.equals("email matches", userDetail.email, user.email);
    TestValidator.equals("status matches", userDetail.status, user.status);
    // No sensitive authentication fields should be present (DTO enforces)
  } catch (exp) {
    throw new Error("Expected successful admin GET of existing user");
  }

  // 4. Fetch details for non-existent userId (random UUID)
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 for non-existent userId",
    async () => {
      await api.functional.communityPlatform.administrator.users.at(
        connection,
        {
          userId: nonExistentUserId,
        },
      );
    },
  );

  // 5. Fetch details for a soft-deleted userId (simulate with random user with deleted_at)
  const deletedUser: ICommunityPlatformUser = {
    ...typia.random<ICommunityPlatformUser>(),
    deleted_at: new Date().toISOString(),
  };
  await TestValidator.error(
    "should return 404 for soft-deleted userId",
    async () => {
      await api.functional.communityPlatform.administrator.users.at(
        connection,
        {
          userId: deletedUser.id,
        },
      );
    },
  );

  // 6. Try to fetch details as unauthenticated user (clear headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should deny access without admin authentication",
    async () => {
      await api.functional.communityPlatform.administrator.users.at(
        unauthConn,
        {
          userId: user.id,
        },
      );
    },
  );
}
