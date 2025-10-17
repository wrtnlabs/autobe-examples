import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Failure scenario: Attempt to change admin password with an incorrect current
 * password.
 *
 * Steps:
 *
 * 1. Create a new admin account via POST /auth/admin/join and capture the returned
 *    authorization payload (IAuthorized). The SDK will set the connection's
 *    authorization token automatically.
 * 2. Attempt to change the admin password using PUT /auth/admin/password but
 *    provide an incorrect currentPassword. The API may either throw an HTTP
 *    error (client 4xx) or return a response object with success === false. The
 *    test accepts either as correct behavior (the password change must be
 *    rejected).
 * 3. Verify that the original password is still valid by performing the
 *    changePassword operation again using the original (correct) current
 *    password and asserting that it succeeds. This demonstrates no partial
 *    state change occurred due to the failed attempt.
 *
 * Business assertions:
 *
 * - Server must reject change attempts when the provided currentPassword is
 *   incorrect.
 * - No partial updates should be applied on failure; the original credential
 *   remains valid.
 */
export async function test_api_admin_change_password_wrong_current(
  connection: api.IConnection,
) {
  // 1. Create an admin account
  const username = RandomGenerator.alphaNumeric(10);
  const email = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`;
  const initialPassword = "InitPass#123";
  const newPassword = "NewPass#456";

  const createBody = {
    username,
    email,
    password: initialPassword,
    displayName: RandomGenerator.name(),
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  const authorized: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Attempt to change password with incorrect current password
  const wrongBody = {
    currentPassword: "WrongPassword!",
    newPassword,
  } satisfies ICommunityPortalAdmin.IChangePassword;

  try {
    const wrongResp: ICommunityPortalAdmin.IChangePasswordResponse =
      await api.functional.auth.admin.password.changePassword(connection, {
        body: wrongBody,
      });

    // If the API returns a structured response instead of throwing,
    // assert the response indicates failure (success === false).
    typia.assert(wrongResp);
    TestValidator.predicate(
      "password change with incorrect current password should be rejected (response indicates failure)",
      wrongResp.success === false,
    );
  } catch (err) {
    // If the API throws (e.g., 400/401), this branch is expected.
    // We avoid asserting HTTP status codes; simply assert that an error occurred.
    TestValidator.predicate(
      "password change with incorrect current password should throw an error",
      !!err,
    );
  }

  // 3. Confirm original password still works by performing a valid change
  const correctBody = {
    currentPassword: initialPassword,
    newPassword,
  } satisfies ICommunityPortalAdmin.IChangePassword;

  const successResp: ICommunityPortalAdmin.IChangePasswordResponse =
    await api.functional.auth.admin.password.changePassword(connection, {
      body: correctBody,
    });
  typia.assert(successResp);

  TestValidator.predicate(
    "password change with correct current password should succeed",
    successResp.success === true,
  );

  // Optional: if server requests reauthentication, ensure response shape contains guidance
  if (successResp.requires_reauthentication !== undefined) {
    TestValidator.predicate(
      "success response includes requires_reauthentication boolean when present",
      typeof successResp.requires_reauthentication === "boolean",
    );
  }
}
