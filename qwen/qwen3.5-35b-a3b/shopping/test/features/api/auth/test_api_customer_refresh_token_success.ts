import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // Extract refresh token from join response
  const originalRefreshToken = joinResult.token.refresh;
  const originalAccessToken = joinResult.token.access;
  // 2. Create connection for refresh operation
  // The refresh utility will set Authorization header internally
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Perform token refresh
  const refreshResult = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IEcommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate token rotation - new tokens must differ from original
  const newRefreshToken = refreshResult.token.refresh;
  const newAccessToken = refreshResult.token.access;
  // Validate refresh token rotation
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    newRefreshToken,
  );
  // Validate access token rotation
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    newAccessToken,
  );
  // Validate customer metadata preserved
  TestValidator.equals(
    "customer id preserved",
    joinResult.id,
    refreshResult.id,
  );
  TestValidator.equals(
    "display name preserved",
    joinResult.display_name,
    refreshResult.display_name,
  );
  TestValidator.equals(
    "email preserved",
    joinResult.email,
    refreshResult.email,
  );
  TestValidator.equals(
    "status preserved",
    joinResult.status,
    refreshResult.status,
  );
  // Validate refresh token in response matches request (for token rotation workflow)
  TestValidator.equals(
    "request refresh token matches response refresh token",
    originalRefreshToken,
    newRefreshToken,
  );
  // Validate timestamp fields are properly formatted (validated by typia.assert)
  TestValidator.predicate(
    "created_at is valid",
    () => joinResult.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    () => joinResult.updated_at !== undefined,
  );
  TestValidator.predicate(
    "expired_at is valid",
    () => refreshResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    () => refreshResult.token.refreshable_until !== undefined,
  );
  // Validate timestamp relationships - session should extend beyond current access token
  TestValidator.predicate(
    "refreshable_until after expired_at",
    new Date(refreshResult.token.refreshable_until).getTime() >
      new Date(refreshResult.token.expired_at).getTime(),
  );
}