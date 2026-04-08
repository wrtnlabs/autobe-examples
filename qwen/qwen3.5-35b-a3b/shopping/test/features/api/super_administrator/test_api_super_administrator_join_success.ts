import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for super administrator join operation
  const joinConnection: api.IConnection = { host: connection.host };
  // Register new super administrator with unique email
  const joinInput = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
  } satisfies IEcommerceMallSuperAdministrator.IJoin;
  // Execute join operation using utility function
  const result = await authorize_super_administrator_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(result);
  // Verify response structure
  TestValidator.equals(
    "super administrator id",
    result.id,
    result.superAdministrator.id,
  );
  // Verify account summary matches input
  TestValidator.equals(
    "email matches input",
    result.superAdministrator.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display_name matches input",
    result.superAdministrator.display_name,
    joinInput.display_name,
  );
  // Verify timestamps are set correctly (ISO 8601 format)
  const createdAt = new Date(result.superAdministrator.created_at);
  const updatedAt = new Date(result.superAdministrator.updated_at);
  const now = new Date();
  TestValidator.predicate(
    "created_at is valid timestamp",
    createdAt.getTime() > now.getTime() - 60000 && createdAt <= now,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    updatedAt.getTime() > now.getTime() - 60000 && updatedAt <= now,
  );
  TestValidator.equals(
    "created_at equals updated_at for new account",
    result.superAdministrator.created_at,
    result.superAdministrator.updated_at,
  );
  // Verify token structure
  typia.assert<IAuthorizationToken>(result.token);
  TestValidator.equals(
    "token has access token",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token has refresh token",
    result.token.refresh.length > 0,
    true,
  );
  // Verify token expiration times
  const accessExpiresAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration is valid",
    accessExpiresAt > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after access token expiration",
    refreshableUntil > accessExpiresAt,
  );
  // Test refresh token functionality
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_super_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: result.token.refresh,
      },
    },
  );
  typia.assert(refreshResult);
  // Verify refresh returns valid tokens
  TestValidator.equals(
    "refresh returns valid access token",
    refreshResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh returns valid refresh token",
    refreshResult.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh preserves super administrator id",
    refreshResult.id,
    result.id,
  );
  TestValidator.equals(
    "refresh preserves email",
    refreshResult.superAdministrator.email,
    result.superAdministrator.email,
  );
}