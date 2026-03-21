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
  // Step 1: Register a new administrator to obtain valid tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // Step 2: Extract the original refresh token from join response
  const originalRefreshToken = joinResult.refresh;
  const originalAccessToken = joinResult.access;
  // Step 3: Call refresh endpoint with valid refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshedConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 4: Verify new access and refresh tokens are different from originals
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResult.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResult.refresh,
    originalRefreshToken,
  );
  // Step 5: Verify response includes admin id, email, name, and token metadata
  TestValidator.equals("admin id preserved", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "admin email preserved",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "admin name preserved",
    refreshResult.name,
    joinResult.name,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshResult.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResult.token.refreshable_until,
    ),
  );
  // Step 6: Verify token metadata values exist and are properly structured
  TestValidator.predicate(
    "new access token is non-empty",
    refreshResult.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    refreshResult.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has valid expiration",
    new Date(refreshResult.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token has valid refreshable_until",
    new Date(refreshResult.token.refreshable_until) > new Date(),
  );
}
