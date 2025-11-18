import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

export async function test_api_admin_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new administrator (dependency: POST /auth/admin/join)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(joined);

  // 2. Login with the same credentials (POST /auth/admin/login)
  const loginBody = {
    email,
    password,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(loggedIn);

  // 3. Token structure validation
  const token: IAuthorizationToken = loggedIn.token;
  TestValidator.predicate(
    "admin login token.access must be a non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "admin login token.refresh must be a non-empty string",
    token.refresh.length > 0,
  );
  TestValidator.predicate(
    "admin login token.expired_at must be a non-empty string",
    token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "admin login token.refreshable_until must be a non-empty string",
    token.refreshable_until.length > 0,
  );

  // 4. Identity consistency between join and login (top-level fields)
  TestValidator.equals(
    "admin login id must match joined admin id",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "admin login email must match joined admin email",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "admin login status must match joined admin status",
    loggedIn.status,
    joined.status,
  );
  TestValidator.equals(
    "admin login email_verified must match joined admin email_verified",
    loggedIn.email_verified,
    joined.email_verified,
  );
  TestValidator.equals(
    "admin login created_at must match joined admin created_at",
    loggedIn.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "admin login updated_at must match joined admin updated_at",
    loggedIn.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "admin login deleted_at must match joined admin deleted_at",
    loggedIn.deleted_at,
    joined.deleted_at,
  );

  // 5. Summary object consistency, if present
  if (loggedIn.admin !== undefined) {
    typia.assert<IShoppingMallAdmin.ISummary>(loggedIn.admin);

    TestValidator.equals(
      "admin summary id must align with top-level id",
      loggedIn.admin.id,
      loggedIn.id,
    );
    TestValidator.equals(
      "admin summary email must align with top-level email",
      loggedIn.admin.email,
      loggedIn.email,
    );
    TestValidator.equals(
      "admin summary status must align with top-level status",
      loggedIn.admin.status,
      loggedIn.status,
    );
    TestValidator.equals(
      "admin summary email_verified must align with top-level email_verified",
      loggedIn.admin.email_verified,
      loggedIn.email_verified,
    );
    TestValidator.equals(
      "admin summary created_at must align with top-level created_at",
      loggedIn.admin.created_at,
      loggedIn.created_at,
    );
    TestValidator.equals(
      "admin summary updated_at must align with top-level updated_at",
      loggedIn.admin.updated_at,
      loggedIn.updated_at,
    );

    // deleted_at is required on top-level but optional on summary, so
    // compare only when summary.deleted_at is not undefined.
    if (loggedIn.admin.deleted_at !== undefined) {
      TestValidator.equals(
        "admin summary deleted_at must align with top-level deleted_at when present",
        loggedIn.admin.deleted_at,
        loggedIn.deleted_at,
      );
    }
  }
}
