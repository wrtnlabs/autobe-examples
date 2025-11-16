import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate that an authenticated admin user cannot delete their own admin
 * account.
 *
 * Business context: Administrative accounts (adminUser) manage the community
 * platform. To prevent accidental lockout or loss of control, the platform
 * should enforce a policy that an admin cannot erase their own admin record
 * while authenticated as that account.
 *
 * Test flow:
 *
 * 1. Register Admin A via POST /auth/adminUser/join, obtaining an
 *    ICommunityPlatformAdminuser.IAuthorized response and establishing an
 *    authenticated admin session on the provided connection.
 * 2. Using the same authenticated connection, attempt to delete Admin A by calling
 *    DELETE /communityPlatform/adminUser/adminUsers/{username} with username
 *    equal to Admin A.username.
 * 3. Assert that this self-deletion attempt fails by verifying that
 *    api.functional.communityPlatform.adminUser.adminUsers.erase throws an
 *    error, using TestValidator.error with an async closure.
 * 4. Do not inspect HTTP status codes or error payload details; only the fact that
 *    an error occurs is asserted, in line with global testing rules.
 */
export async function test_api_admin_user_deletion_self_delete_protection(
  connection: api.IConnection,
) {
  // 1. Register Admin A and obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // Sanity check: ensure the created username matches the join payload
  TestValidator.equals(
    "joined admin username matches request username",
    admin.username,
    joinBody.username,
  );

  // 2. Attempt to delete the same admin account (self-deletion)
  await TestValidator.error(
    "self-deletion of admin account must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.erase(
        connection,
        {
          username: admin.username,
        },
      );
    },
  );
}
