import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Submit admin join request to create new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  const originalRefreshableUntil = initialAuth.token.refreshable_until;
  // Verify initial auth response structure
  TestValidator.equals("admin id exists", !!initialAuth.id, true);
  TestValidator.equals("admin email exists", !!initialAuth.email, true);
  TestValidator.equals("admin name exists", !!initialAuth.name, true);
  TestValidator.equals("access token exists", !!initialAuth.token.access, true);
  TestValidator.equals(
    "refresh token exists",
    !!initialAuth.token.refresh,
    true,
  );
  TestValidator.equals(
    "expired_at exists",
    !!initialAuth.token.expired_at,
    true,
  );
  TestValidator.equals(
    "refreshable_until exists",
    !!initialAuth.token.refreshable_until,
    true,
  );
  // 2. Call POST /ecommerceMall/auth/admin/refresh with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    },
  });
  typia.assert(refreshedAuth);
  // 3. Verify response returns new access and refresh tokens
  TestValidator.equals(
    "new access token exists",
    !!refreshedAuth.token.access,
    true,
  );
  TestValidator.equals(
    "new refresh token exists",
    !!refreshedAuth.token.refresh,
    true,
  );
  // 4. Verify new tokens are different from original tokens (token rotation working)
  TestValidator.notEquals(
    "new access token is different",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token is different",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 5. Verify response includes token expiration metadata
  TestValidator.equals(
    "new expired_at exists",
    !!refreshedAuth.token.expired_at,
    true,
  );
  TestValidator.equals(
    "new refreshable_until exists",
    !!refreshedAuth.token.refreshable_until,
    true,
  );
  // 6. Verify response contains admin identity fields (same admin)
  TestValidator.equals("admin id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "admin email matches",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "admin name matches",
    refreshedAuth.name,
    initialAuth.name,
  );
  // 7. Verify the new refresh token can be used for subsequent refresh operations
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshedAuth = await authorize_admin_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: refreshedAuth.token.refresh,
      },
    },
  );
  typia.assert(secondRefreshedAuth);
  // Verify second refresh also works and produces new tokens
  TestValidator.notEquals(
    "second new access token is different",
    secondRefreshedAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "second new refresh token is different",
    secondRefreshedAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
}
