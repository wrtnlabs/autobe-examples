import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

export async function test_api_admin_login_existing(
  connection: api.IConnection,
) {
  // Create a new admin user to establish existing user context for login
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "P@ssw0rd123";

  // Call join API to create admin
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: { email, password } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Attempt to login with created admin credentials
  const loginResponse: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: admin.email,
        password: password,
        ip: null,
        href: "https://localhost/login",
        referrer: "https://localhost/",
      } satisfies IDiscussionBoardAdmin.ILogin,
    });

  typia.assert(loginResponse);

  // Validate presence of token object and its properties
  TestValidator.predicate(
    "login returns access token",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns refresh token",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at timestamp",
    typeof loginResponse.token.expired_at === "string" &&
      loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable_until timestamp",
    typeof loginResponse.token.refreshable_until === "string" &&
      loginResponse.token.refreshable_until.length > 0,
  );
}
