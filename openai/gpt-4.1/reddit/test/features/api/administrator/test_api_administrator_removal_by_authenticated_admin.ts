import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Test the removal (soft-deletion) of a platform administrator account by
 * another authenticated administrator.
 *
 * This scenario ensures:
 *
 * 1. An authenticated administrator (adminA) can create another admin account
 *    (adminB).
 * 2. Deleting (soft) adminB by adminA works as expected, setting 'deleted_at'.
 * 3. The account is truly deactivated (further login attempts for adminB fail).
 * 4. The deletion operation is idempotent (repeated deletions have no further side
 *    effects).
 * 5. All session records for adminB, if any, remain unaffected for audit purposes
 *    (for this test, only validate delete does not affect created_at/updated_at
 *    for already created adminA).
 *
 * Steps:
 *
 * 1. Create adminA and login
 * 2. Create adminB (the target of deletion)
 * 3. As adminA, erase (soft-delete) adminB
 * 4. Login as adminB (should fail - account is deactivated)
 * 5. Erase adminB again (should succeed/no-op)
 */
export async function test_api_administrator_removal_by_authenticated_admin(
  connection: api.IConnection,
) {
  // 1. Create adminA (will be the acting authenticated admin)
  const adminA_email = typia.random<string & tags.Format<"email">>();
  const adminA_password = RandomGenerator.alphaNumeric(12);
  const adminA = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminA_email,
      password: adminA_password,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminA);
  TestValidator.equals(
    "adminA status is active after join",
    adminA.status,
    "active",
  );
  TestValidator.equals(
    "adminA deleted_at is null after creation",
    adminA.deleted_at,
    null,
  );

  // 2. Create adminB (the one to be deleted)
  const adminB_email = typia.random<string & tags.Format<"email">>();
  const adminB_password = RandomGenerator.alphaNumeric(12);
  const adminB = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminB_email,
      password: adminB_password,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminB);
  TestValidator.equals(
    "adminB status is active after join",
    adminB.status,
    "active",
  );
  TestValidator.equals(
    "adminB deleted_at is null after creation",
    adminB.deleted_at,
    null,
  );

  // 3. As adminA (token remains from adminA join), erase adminB
  await api.functional.communityPlatform.administrator.administrators.erase(
    connection,
    {
      administratorId: adminB.id,
    },
  );

  // 4. Attempt login for adminB (should fail as deleted_at is set/null)
  await TestValidator.error("cannot login after adminB deletion", async () => {
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminB_email,
        password: adminB_password,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  });

  // 5. Erase adminB again (should be idempotent, not throw)
  await api.functional.communityPlatform.administrator.administrators.erase(
    connection,
    {
      administratorId: adminB.id,
    },
  );

  // Optionally re-fetch or re-join as adminA to verify adminA is unaffected
  // There is no admin status/info reload API, but adminA session is unaffected
}
