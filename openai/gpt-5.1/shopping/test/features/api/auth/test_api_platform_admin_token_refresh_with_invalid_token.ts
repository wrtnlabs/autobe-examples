import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminRefresh";

export async function test_api_platform_admin_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Create a valid platform admin via join to ensure environment is initialized.
  const joinRequestBody =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joinedAdmin);

  // 2. Perform a valid refresh call to confirm the happy path works.
  const validRefreshRequestBody: IShoppingMallPlatformAdminRefresh.IRequest = {
    refreshToken: joinedAdmin.token.refresh,
    ip: "127.0.0.1",
    userAgent: "e2e-test-suite/1.0",
    correlationId: RandomGenerator.alphaNumeric(16),
  };

  const refreshedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.refresh(connection, {
      body: validRefreshRequestBody,
    });
  typia.assert(refreshedAdmin);

  // 3. Construct an invalid refresh token string that still satisfies the DTO type.
  const invalidRefreshToken: string = RandomGenerator.alphaNumeric(64);

  const invalidRefreshRequestBody: IShoppingMallPlatformAdminRefresh.IRequest =
    {
      refreshToken: invalidRefreshToken,
      ip: "127.0.0.1",
      userAgent: "e2e-test-suite/1.0 (invalid-token)",
      correlationId: RandomGenerator.alphaNumeric(16),
    };

  // 4. Verify that using the invalid refresh token results in an error (HttpError),
  // without asserting on specific HTTP status codes.
  await TestValidator.error(
    "platform admin refresh with invalid token must fail",
    async () => {
      await api.functional.auth.platformAdmin.refresh(connection, {
        body: invalidRefreshRequestBody,
      });
    },
  );
}
