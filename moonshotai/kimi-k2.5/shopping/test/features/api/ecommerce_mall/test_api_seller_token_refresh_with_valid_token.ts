import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test successful token refresh for an authenticated seller. First, register a new seller via the join endpoint to obtain initial access and refresh tokens. Then submit a refresh request with the valid refresh token. Verify the response contains a new access token with updated expiration timestamp, a new refresh token (if rotation is enabled), and complete seller account information including id, email, approvalStatus, profile, and token details. Ensure the new access token is different from the original and has a future expiration time. This validates the core JWT refresh flow that maintains long-lived sessions without requiring credential re-entry.
 */
export async function test_api_seller_token_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new seller to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(initialAuth);
  const originalAccessToken = initialAuth.token.access;
  const originalExpiredAt = initialAuth.token.expired_at;
  // Step 2: Submit refresh request with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: initialAuth.token.refresh,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Verify new access token is different from original
  TestValidator.notEquals(
    "access token differs after refresh",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  // Step 4: Verify new expiration is in the future
  TestValidator.notEquals(
    "expiration timestamp updated",
    originalExpiredAt,
    refreshedAuth.token.expired_at,
  );
  TestValidator.predicate(
    "new expiration is in the future",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  // Step 5: Verify complete seller account information is consistent
  TestValidator.equals(
    "seller id consistent",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "seller email consistent",
    refreshedAuth.email,
    initialAuth.email,
  );
}
