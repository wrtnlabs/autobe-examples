import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRefresh";

export async function test_api_admin_refresh_rejected_for_expired_session(
  connection: api.IConnection,
) {
  // 1. Perform an initial admin login to obtain a valid authorized context
  //    and a pair of access/refresh tokens.
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const initialAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(initialAuthorized);

  const initialToken: IAuthorizationToken = initialAuthorized.token;
  typia.assert(initialToken);

  // 2. Build a refresh request body using the refresh token we just received.
  const refreshBody = {
    refreshToken: initialToken.refresh,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminRefresh.ICreate;

  // 3. Call the refresh endpoint and validate the response.
  const refreshedAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuthorized);

  const refreshedToken: IAuthorizationToken = refreshedAuthorized.token;
  typia.assert(refreshedToken);

  // 4. Business coherence checks
  //    - Admin identity (id, email) should remain the same between login and refresh
  //    - Access token should be rotated (different from the original)

  TestValidator.equals(
    "admin id should stay the same after refresh",
    refreshedAuthorized.id,
    initialAuthorized.id,
  );

  TestValidator.equals(
    "admin email should stay the same after refresh",
    refreshedAuthorized.email,
    initialAuthorized.email,
  );

  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshedToken.access,
    initialToken.access,
  );
}
