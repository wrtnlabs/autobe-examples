import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super administrator join
  const joinConnection: api.IConnection = { host: connection.host };
  // Register a new super administrator and obtain initial authentication tokens
  const initialAuth = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(initialAuth);
  // Use the connection with joined authentication for refresh operation
  const refreshConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: initialAuth.token.access },
  };
  // Use the refresh token to refresh authentication tokens via utility function
  const refreshedAuth = await authorize_super_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: initialAuth.token.refresh,
      } satisfies IEcommerceSuperAdministrator.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // Validate that user identity remains consistent after refresh
  TestValidator.equals(
    "user id should remain the same",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "email should remain the same",
    refreshedAuth.email,
    initialAuth.email,
  );
  // Validate that refresh operation generated new tokens
  TestValidator.notEquals(
    "refresh should return new access token",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh should return new refresh token",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // Validate token structure integrity
  TestValidator.predicate(
    "new access token should not be empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should not be empty",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration time should be valid",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until time should be valid",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
}
