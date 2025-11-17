import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_existing_account(
  connection: api.IConnection,
) {
  // 1. Administrator joins the system with unique email and password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";
  const href = "https://admin.example.com/login";
  const referrer = "https://admin.example.com/";

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: href,
        referrer: referrer,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(joinedAdmin);

  // 2. Administrator attempts login using existing credentials
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: href,
        referrer: referrer,
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Verify that the logged-in admin matches the joined one
  TestValidator.equals(
    "admin email after login should match joined email",
    loggedInAdmin.email,
    joinedAdmin.email,
  );

  // 4. Verify token properties are present and valid
  const accessToken = loggedInAdmin.token.access;
  const refreshToken = loggedInAdmin.token.refresh;
  const expiredAt = loggedInAdmin.token.expired_at;
  const refreshableUntil = loggedInAdmin.token.refreshable_until;

  TestValidator.predicate(
    "access token is a non-empty string",
    typeof accessToken === "string" && accessToken.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof refreshToken === "string" && refreshToken.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a valid ISO date-time string",
    typeof expiredAt === "string" && expiredAt.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is a valid ISO date-time string",
    typeof refreshableUntil === "string" && refreshableUntil.length > 0,
  );
}
