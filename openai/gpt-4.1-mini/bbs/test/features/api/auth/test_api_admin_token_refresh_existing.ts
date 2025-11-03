import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

export async function test_api_admin_token_refresh_existing(
  connection: api.IConnection,
) {
  // 1. Create a new admin account via /auth/admin/join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const password = "secure_password_123";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Refresh tokens using the issued refresh token
  const refreshBody: IDiscussionBoardAdmin.IRefresh = {
    refresh_token: admin.token.refresh,
    ip: "127.0.0.1",
    href: "https://discussion.example.com/admin/dashboard",
    referrer: "https://discussion.example.com/admin/login",
  };
  const refreshedAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAdmin);

  // 3. Validate new tokens are returned and differ from the initial ones
  TestValidator.predicate(
    "Access token is refreshed and differs",
    refreshedAdmin.token.access !== admin.token.access,
  );
  TestValidator.predicate(
    "Refresh token is refreshed and differs",
    refreshedAdmin.token.refresh !== admin.token.refresh,
  );

  // 4. Validate that token expiration dates are valid ISO strings
  TestValidator.predicate(
    "Access token expiry is valid ISO date",
    typeof refreshedAdmin.token.expired_at === "string" &&
      refreshedAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Refresh token expiry is valid ISO date",
    typeof refreshedAdmin.token.refreshable_until === "string" &&
      refreshedAdmin.token.refreshable_until.length > 0,
  );

  // 5. Validate admin identity remains the same
  TestValidator.equals(
    "Admin ID remains unchanged",
    refreshedAdmin.id,
    admin.id,
  );
  TestValidator.equals(
    "Admin email remains unchanged",
    refreshedAdmin.email,
    admin.email,
  );
}
