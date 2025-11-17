import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new admin user to obtain initial authorization tokens
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "password123";
  const href: string & tags.Format<"uri"> = "https://example.com/register";
  const referrer: string & tags.Format<"uri"> = "https://example.com";

  const joinBody = {
    email: email,
    password: password,
    ip: null,
    href: href,
    referrer: referrer,
  } satisfies IShoppingMallAdmin.IJoin;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Use the refresh token from initial authentication to request new tokens
  const refreshBody = {
    refreshToken: authorized.token.refresh,
  } satisfies IShoppingMallAdmin.IRefresh;

  const refreshed: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3. Validate the refreshed tokens correspond to the authenticated admin user
  TestValidator.equals(
    "refreshed admin id equals original",
    refreshed.id,
    authorized.id,
  );
  TestValidator.equals(
    "refreshed admin email equals original",
    refreshed.email,
    authorized.email,
  );

  // 4. Validate new access and refresh tokens are non-empty and different from original
  TestValidator.predicate(
    "new access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token should change",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token should change",
    refreshed.token.refresh,
    authorized.token.refresh,
  );
}
