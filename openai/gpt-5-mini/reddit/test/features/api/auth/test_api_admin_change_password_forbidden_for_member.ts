import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Authorization: Ensure a non-admin member cannot call admin-only
 * change-password endpoint.
 *
 * Flow:
 *
 * 1. Create an admin account (POST /auth/admin/join) and assert response.
 * 2. Create a regular member account (POST /auth/member/join) and assert response.
 * 3. While authenticated as the member (SDK sets Authorization), attempt PUT
 *    /auth/admin/password and assert that the call fails (access denied). Do
 *    NOT assert specific HTTP status codes.
 *
 * Notes:
 *
 * - Uses provided SDK functions only.
 * - Request bodies use `satisfies` to ensure correct DTO variants.
 * - All API calls are awaited. typia.assert is used for response validation.
 */
export async function test_api_admin_change_password_forbidden_for_member(
  connection: api.IConnection,
) {
  // 1) Create an admin account to serve as the protected subject
  const adminBody = {
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
  } satisfies ICommunityPortalAdmin.ICreate;

  const admin: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  // Validate admin response shape
  typia.assert(admin);

  // 2) Create a regular member account and obtain its token
  const memberBody = {
    username: `member_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const memberAuth: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  // Validate member response shape
  typia.assert(memberAuth);

  // 3) Attempt to call admin change-password with the member's token
  //    Expect an error (access control). We do not assert specific HTTP codes.
  await TestValidator.error("member cannot change admin password", async () => {
    await api.functional.auth.admin.password.changePassword(connection, {
      body: {
        currentPassword: memberBody.password,
        newPassword: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPortalAdmin.IChangePassword,
    });
  });

  // Post-conditions / best-effort validation:
  // We re-assert the admin object we initially received to ensure it remained valid.
  // Note: The provided SDK materials do not include an admin-login endpoint to verify
  // the admin's credential unchanged by attempting a login, therefore we validate
  // that the creation response remains a valid ICommunityPortalAdmin.IAuthorized.
  typia.assert(admin);
}
