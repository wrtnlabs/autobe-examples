import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";

export async function test_api_auth_admin_login_existing(
  connection: api.IConnection,
) {
  // 1. Create a new administrator account with join operation
  const username = RandomGenerator.alphaNumeric(10);
  const email = `${username}@example.com`;
  const password = "Password123!";

  const adminAuthorized: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: username,
        email: email,
        password: password,
      } satisfies IEconPolDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Login with correct username and password
  const adminLoginResponse: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        username: username,
        password: password,
        ip: null,
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin",
      } satisfies IEconPolDiscussionBoardAdmin.ILogin,
    });
  typia.assert(adminLoginResponse);

  // 3. Validate that access token, refresh token, and expiration fields exist
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof adminLoginResponse.token.access === "string" &&
      adminLoginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof adminLoginResponse.token.refresh === "string" &&
      adminLoginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a non-empty string",
    typeof adminLoginResponse.token.expired_at === "string" &&
      adminLoginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is a non-empty string",
    typeof adminLoginResponse.token.refreshable_until === "string" &&
      adminLoginResponse.token.refreshable_until.length > 0,
  );

  // 4. Validate that admin user fields are returned correctly
  TestValidator.equals(
    "username matches",
    adminLoginResponse.adminUsername,
    username,
  );
  TestValidator.equals("email matches", adminLoginResponse.email, email);
  TestValidator.predicate(
    "created_at is string",
    typeof adminLoginResponse.created_at === "string" &&
      adminLoginResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof adminLoginResponse.updated_at === "string" &&
      adminLoginResponse.updated_at.length > 0,
  );
  TestValidator.predicate("role is admin", adminLoginResponse.role === "admin");
  TestValidator.predicate(
    "is_active is boolean",
    typeof adminLoginResponse.is_active === "boolean",
  );
  TestValidator.predicate(
    "id is string",
    typeof adminLoginResponse.id === "string" &&
      adminLoginResponse.id.length > 0,
  );

  // deleted_at may be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined or string",
    adminLoginResponse.deleted_at === null ||
      adminLoginResponse.deleted_at === undefined ||
      (typeof adminLoginResponse.deleted_at === "string" &&
        adminLoginResponse.deleted_at.length > 0),
  );
}
