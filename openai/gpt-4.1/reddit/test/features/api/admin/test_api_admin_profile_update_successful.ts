import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Test an administrator successfully updates their profile details such as
 * display name or email. The workflow validates that only non-sensitive fields
 * can be updated, all changes trigger audit logging, and the account is not
 * soft-deleted (deleted_at is null) prior to update. Expected outcome: The
 * updated profile is returned and audit compliance is maintained.
 *
 * Steps:
 *
 * 1. Register a new administrator (join)
 * 2. Ensure the admin exists by initiating a password reset request
 * 3. Update profile details (display_name and/or email)
 * 4. Validate the permitted fields are updated, sensitive fields are untouched
 * 5. Confirm deleted_at is still null (account not soft-deleted)
 * 6. Confirm that audit and updated_at fields are changed accordingly
 */
export async function test_api_admin_profile_update_successful(
  connection: api.IConnection,
) {
  // 1. Register new administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminDisplayName: string = RandomGenerator.name();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const joinOutput: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
        href: "https://example.com/register",
        referrer: "https://example.com/login",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(joinOutput);
  TestValidator.equals("joined admin email", joinOutput.email, adminEmail);
  TestValidator.equals(
    "joined admin display_name",
    joinOutput.display_name,
    adminDisplayName,
  );
  TestValidator.equals("not deleted on join", joinOutput.deleted_at, null);

  // 2. Ensure account existence by requesting a password reset
  const resetResult =
    await api.functional.auth.admin.password.reset.request.resetPasswordRequest(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies ICommunityPlatformAdmin.IResetPasswordRequest,
      },
    );
  typia.assert(resetResult);

  // 3. Update the admin profile: Change display_name and email
  const newDisplayName: string = RandomGenerator.name();
  const newEmail: string = typia.random<string & tags.Format<"email">>();
  const beforeProfile = { ...joinOutput };
  const updated = await api.functional.communityPlatform.admin.admins.update(
    connection,
    {
      adminId: joinOutput.id,
      body: {
        display_name: newDisplayName,
        email: newEmail,
      } satisfies ICommunityPlatformAdmin.IUpdate,
    },
  );
  typia.assert(updated);

  // 4. Check only allowed fields changed and sensitive data untouched
  TestValidator.equals(
    "updated display_name",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals("updated email", updated.email, newEmail);
  TestValidator.equals("adminId stays same", updated.id, joinOutput.id);
  TestValidator.equals("not deleted after update", updated.deleted_at, null);
  TestValidator.notEquals(
    "updated_at should advance after update",
    updated.updated_at,
    beforeProfile.updated_at,
  );
  TestValidator.equals(
    "created_at should not change",
    updated.created_at,
    beforeProfile.created_at,
  );
}
