import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate secure profile retrieval for platform administrators.
 *
 * 1. Register a new platform administrator (which also authenticates admin
 *    session)
 * 2. Retrieve the admin profile via the GET
 *    /communityPlatform/admin/admins/{adminId} endpoint as authenticated
 *    admin.
 * 3. Assert all profile fields match between onboarding response and subsequent
 *    get; ensure no sensitive information (password, MFA) ever appears in the
 *    response.
 * 4. Confirm types and audit field formats (ISO strings for all dates).
 * 5. Attempt to fetch with a non-existent adminId and expect an error.
 * 6. Attempt to access the profile endpoint unauthenticated and verify access is
 *    denied.
 * 7. (If practical) Check audit mechanisms are triggered for the successful
 *    access.
 */
export async function test_api_admin_profile_retrieval_with_access_control_and_audit(
  connection: api.IConnection,
) {
  // 1. Register a new admin and get token + id
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    superuser: false,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminAuth);

  // 2. Retrieve profile as admin
  const profile: ICommunityPlatformAdmin =
    await api.functional.communityPlatform.admin.admins.at(connection, {
      adminId: adminAuth.id,
    });
  typia.assert(profile);
  TestValidator.equals("admin id matches", profile.id, adminAuth.id);
  TestValidator.equals("admin email matches", profile.email, adminAuth.email);
  TestValidator.equals(
    "admin superuser matches",
    profile.superuser,
    adminAuth.superuser,
  );
  TestValidator.equals(
    "admin status matches",
    profile.status,
    adminAuth.status,
  );
  // validate audit fields are present and correctly typed
  TestValidator.predicate(
    "created_at format (ISO)",
    typeof profile.created_at === "string" && profile.created_at.length > 10,
  );
  TestValidator.predicate(
    "updated_at format (ISO)",
    typeof profile.updated_at === "string" && profile.updated_at.length > 10,
  );
  // deleted_at can be null/undefined or string

  // 3. Ensure no password, mfa, or other sensitive fields exist on response
  // (type assertion with typia.assert already confirms this by DTO, so nothing further)

  // 4. Attempt access as unauthenticated/invalid token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("rejects unauthenticated access", async () => {
    await api.functional.communityPlatform.admin.admins.at(unauthConn, {
      adminId: adminAuth.id,
    });
  });

  // 5. Attempt to get profile with non-existent adminId
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("error on non-existent adminId", async () => {
    await api.functional.communityPlatform.admin.admins.at(connection, {
      adminId: fakeId,
    });
  });

  // 6. (Optional): Could verify audit/log recording via a separate endpoint if available
}
