import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate successful login for an active discussion board administrator.
 *
 * This test checks that a registered admin can log in using correct
 * credentials. It submits a known, valid admin email and password to the
 * /auth/admin/login endpoint and verifies that:
 *
 * 1. The response is successful (no error thrown)
 * 2. The returned admin identity matches the submitted email
 * 3. JWT tokens are issued and present in the response
 * 4. The admin account's deleted_at field is null (active account)
 *
 * This test assumes the admin account (test_admin@example.com / AdminTest@123)
 * is present and active in the database. Assertions validate authentication
 * success, correct identification, token issuance, and account status.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // Use a pre-seeded admin account (ensure this exists in seed data)
  const email = "test_admin@example.com" as string & tags.Format<"email">;
  const password = "AdminTest@123" as string & tags.MinLength<8>;
  const response: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(response);
  TestValidator.equals(
    "login response email matches input",
    response.email,
    email,
  );
  TestValidator.equals(
    "deleted_at should be null for active admin",
    response.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is present",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration date is valid ISO string",
    typeof response.token.expired_at === "string" &&
      response.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration date is valid ISO string",
    typeof response.token.refreshable_until === "string" &&
      response.token.refreshable_until.length > 0,
  );
}
