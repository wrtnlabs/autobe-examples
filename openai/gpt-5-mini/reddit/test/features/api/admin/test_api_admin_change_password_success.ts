import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_admin_change_password_success(
  connection: api.IConnection,
) {
  // 1) Create a fresh admin account
  const initialPassword = `P@ss-${RandomGenerator.alphaNumeric(6)}`;
  const newPassword = `N3wP@ss-${RandomGenerator.alphaNumeric(6)}`;

  const adminCreateBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
    displayName: RandomGenerator.name(),
  } satisfies ICommunityPortalAdmin.ICreate;

  const authorized: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorized);

  // Basic validations for the join response and token
  TestValidator.predicate(
    "admin join returned access token",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorized contains admin summary and user summary",
    typeof authorized.admin?.id === "string" &&
      typeof authorized.user?.id === "string",
  );

  // 2) Perform password change with the correct current password
  const changeBody = {
    currentPassword: initialPassword,
    newPassword,
  } satisfies ICommunityPortalAdmin.IChangePassword;

  const response: ICommunityPortalAdmin.IChangePasswordResponse =
    await api.functional.auth.admin.password.changePassword(connection, {
      body: changeBody,
    });
  typia.assert(response);

  // Business validations
  TestValidator.equals("password change success", response.success, true);
  TestValidator.predicate(
    "change response contains message",
    typeof response.message === "string" && response.message.length > 0,
  );

  // If server provided updated_at, ensure it's a valid ISO date-time
  if (response.updated_at !== undefined) {
    const parsed = Date.parse(response.updated_at);
    TestValidator.predicate(
      "updated_at is a valid date-time",
      !Number.isNaN(parsed),
    );
  }

  // If requires_reauthentication is present, it should be a boolean (typia.assert already enforces this)
  TestValidator.predicate(
    "requires_reauthentication is boolean or undefined",
    response.requires_reauthentication === undefined ||
      typeof response.requires_reauthentication === "boolean",
  );
}
