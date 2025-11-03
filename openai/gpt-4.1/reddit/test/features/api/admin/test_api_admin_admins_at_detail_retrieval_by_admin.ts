import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate retrieval of admin detail by an authenticated admin actor.
 *
 * The test covers business logic for detail endpoint: only authenticated
 * non-deleted admins can retrieve detail, deleted/nonexistent ids are denied,
 * and no sensitive credential fields are ever exposed. Access is strictly
 * audited. Steps:
 *
 * 1. Register a new admin account and ensure authentication context.
 * 2. Perform a password reset request to ensure account existence.
 * 3. With valid admin session, GET detail for the created admin by id. Assert:
 *
 *    - Fields match the admin DTO definition (no credentials or tokens).
 *    - All non-sensitive identity and audit fields present.
 *    - Deleted_at is null or undefined.
 * 4. Attempt retrieval for a random, unregistered (non-existent) adminId:
 *
 *    - Must be denied with error.
 * 5. Attempt retrieval for a soft-deleted admin (simulate by registering &
 *    deleting):
 *
 *    - Must be denied (soft-deletion is via deleted_at presence).
 * 6. Confirm unauthorized/unauthenticated access is denied for non-admin context.
 */
export async function test_api_admin_admins_at_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminDisplayName: string = RandomGenerator.name();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: adminDisplayName,
    href: "https://adminsite.test/register",
    referrer: "https://adminsite.test/",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const authorized: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Ensure existence by password reset request
  const resetRequestBody = {
    email: adminEmail,
  } satisfies ICommunityPlatformAdmin.IResetPasswordRequest;
  const resetResult: ICommunityPlatformAdmin.IResetPasswordRequestResult =
    await api.functional.auth.admin.password.reset.request.resetPasswordRequest(
      connection,
      { body: resetRequestBody },
    );
  typia.assert(resetResult);

  // 3. Authenticated admin retrieves their own detail.
  const detail: ICommunityPlatformAdmin =
    await api.functional.communityPlatform.admin.admins.at(connection, {
      adminId: authorized.id,
    });
  typia.assert(detail);
  TestValidator.equals("admin id matches", detail.id, authorized.id);
  TestValidator.equals("admin email matches", detail.email, adminEmail);
  TestValidator.equals(
    "admin display_name matches",
    detail.display_name,
    adminDisplayName,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    detail.deleted_at,
    null,
  );
  // Assert there are no sensitive credential or token fields in the detail response.
  TestValidator.predicate(
    "no credential fields in detail DTO",
    Object.keys(detail).every((key) =>
      [
        "id",
        "email",
        "display_name",
        "created_at",
        "updated_at",
        "deleted_at",
      ].includes(key),
    ),
  );

  // 4. Try to read nonexistent adminId -- must fail
  const randomId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "retrieving nonexistent admin must fail",
    async () => {
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: randomId,
      });
    },
  );

  // 5. Simulate soft-deleted admin (register new, then soft delete via custom endpoint or field mock - not available, so skip this step; typically would need explicit soft-delete API)

  // 6. Unauthorized access (simulate by clearing token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.communityPlatform.admin.admins.at(unauthConn, {
      adminId: authorized.id,
    });
  });
}
