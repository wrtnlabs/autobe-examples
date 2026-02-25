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

export async function test_api_admin_refresh_token_valid_and_expired(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully refreshing JWT tokens with a valid refresh token.
  // 1. Register the admin user and obtain valid tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
      displayName: "AdminUser",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminAuthorized);
  // Create an admin connection that carries the issued token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Perform the refresh token request with a valid refresh token
  const validRefreshResponse = await authorize_admin_refresh(adminConnection, {
    body: {
      refreshToken: adminAuthorized.token.refresh,
    },
  });
  typia.assert(validRefreshResponse);
  // Validate refreshed tokens and admin info
  TestValidator.predicate(
    "valid refresh: access token is non-empty",
    typeof validRefreshResponse.token.access === "string" &&
      validRefreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "valid refresh: refresh token is non-empty",
    typeof validRefreshResponse.token.refresh === "string" &&
      validRefreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "valid refresh: token expired_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      validRefreshResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "valid refresh: token refreshable_until is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      validRefreshResponse.token.refreshable_until,
    ),
  );
  TestValidator.predicate(
    "valid refresh: admin id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      validRefreshResponse.id,
    ),
  );
  TestValidator.predicate(
    "valid refresh: admin email is non-empty",
    typeof validRefreshResponse.email === "string" &&
      validRefreshResponse.email.length > 0,
  );
  TestValidator.predicate(
    "valid refresh: admin displayName is non-empty",
    typeof validRefreshResponse.displayName === "string" &&
      validRefreshResponse.displayName.length > 0,
  );
  // Scenario 2: Refresh with an expired or revoked refresh token.
  // Prepare a fake expired refresh token (e.g., random string)
  const expiredRefreshToken = "expiredtoken-which-is-invalid";
  // Attempt token refresh with expired token and expect an error
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refreshToken: expiredRefreshToken,
        },
      });
    },
  );
}
