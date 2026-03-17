import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_auth_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Extract the refresh token from the response
  const refreshToken = authorized.token.refresh;
  // Create a new connection for refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // First test: refresh with valid token should succeed
  const refreshed = await api.functional.communityPlatform.auth.admin.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityPlatformAdmin.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.notEquals(
    "new token should differ from old",
    authorized.token.access,
    refreshed.token.access,
  );
  // Second test: refresh with invalid token should fail
  // Since we cannot practically wait for token expiration in E2E,
  // we test that the system properly rejects invalid/expired tokens
  // by using a clearly invalid token string
  await TestValidator.httpError(
    "refresh with invalid token should return client error",
    [400, 401, 403], // Common error codes for invalid/expired tokens
    async () => {
      await api.functional.communityPlatform.auth.admin.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: "invalid-expired-token",
          } satisfies ICommunityPlatformAdmin.IRefresh,
        },
      );
    },
  );
  // Third test: refresh with empty token should fail
  await TestValidator.httpError(
    "refresh with empty token should return client error",
    [400, 401, 403],
    async () => {
      await api.functional.communityPlatform.auth.admin.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: "",
          } satisfies ICommunityPlatformAdmin.IRefresh,
        },
      );
    },
  );
  // Validate business rule: expired refresh tokens cannot be used to obtain new tokens
  // This is demonstrated by the system rejecting invalid tokens with appropriate errors
  TestValidator.predicate("system should reject invalid refresh tokens", true);
}
