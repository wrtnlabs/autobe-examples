import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_forbidden_to_view_seller_credentials_without_auth(
  connection: api.IConnection,
) {
  // 1. Bootstrap: exercise platform admin join on an isolated connection
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  // Use a separate connection so that Authorization header mutation
  // performed by the SDK does not affect the main test connection.
  const tempConn: api.IConnection = {
    ...connection,
    headers: connection.headers ? { ...connection.headers } : undefined,
  };

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(tempConn, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Prepare a random sellerId (syntactically valid UUID)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Scenario A: unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated access must fail", async () => {
    await api.functional.shoppingMall.platformAdmin.sellers.credentials.at(
      unauthConn,
      {
        sellerId,
      },
    );
  });

  // 4. Scenario B: connection with an invalid/garbage Authorization token
  const invalidConn: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer invalid-or-expired-token",
    },
  };

  await TestValidator.error("invalid token access must fail", async () => {
    await api.functional.shoppingMall.platformAdmin.sellers.credentials.at(
      invalidConn,
      {
        sellerId,
      },
    );
  });
}
