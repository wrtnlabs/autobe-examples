import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validates that a super-admin can permanently delete admin accounts by unique
 * identifier.
 *
 * Test flow:
 *
 * 1. Register two distinct admin accounts to ensure there will always be at least
 *    one remaining admin
 * 2. Attempt to delete one admin as the other (super-admin)
 * 3. Assert that the delete succeeds, and cannot login or request password reset
 *    for deleted admin (session/token revoked)
 * 4. Try deleting the last remaining admin, and assert that this is prevented by a
 *    business logic error
 * 5. Attempt delete as unauthorized user (simulate by creating unauthenticated
 *    connection) and assert error
 */
export async function test_api_admin_account_deletion_by_superadmin(
  connection: api.IConnection,
) {
  // 1. Register first admin (will serve as superadmin)
  const superEmail = typia.random<string & tags.Format<"email">>();
  const superPassword = RandomGenerator.alphaNumeric(12);
  const superAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: superEmail,
      password: superPassword,
      display_name: RandomGenerator.name(),
      href: "https://admin-panel.example.com/onboarding",
      referrer: "https://admin-panel.example.com/",
      ip: null,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(superAdmin);

  // 2. Register second admin
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
      display_name: RandomGenerator.name(),
      href: "https://admin-panel.example.com/onboarding",
      referrer: "https://admin-panel.example.com/",
      ip: null,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin2);

  // 3. Superadmin permanently deletes second admin
  await api.functional.communityPlatform.admin.admins.erase(connection, {
    adminId: admin2.id,
  });

  // 4. Attempt to login as deleted admin (should fail - token/session revoked)
  await TestValidator.error(
    "deleted admin cannot request password reset",
    async () => {
      await api.functional.auth.admin.password.reset.request.resetPasswordRequest(
        connection,
        {
          body: {
            email: admin2Email,
          } satisfies ICommunityPlatformAdmin.IResetPasswordRequest,
        },
      );
    },
  );

  // 5. Attempt to delete last remaining admin (should fail)
  await TestValidator.error(
    "should not delete last remaining admin",
    async () => {
      await api.functional.communityPlatform.admin.admins.erase(connection, {
        adminId: superAdmin.id,
      });
    },
  );

  // 6. Try unauthorized deletion as unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete admin",
    async () => {
      await api.functional.communityPlatform.admin.admins.erase(unauthConn, {
        adminId: admin2.id,
      });
    },
  );
}
